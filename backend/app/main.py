import os
import re
from typing import Optional

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, field_validator

from . import sample_tests, evaluator, ml_risk, demo_chatbot, reports, test_runner, rate_limiter, auth

app = FastAPI(title="AssureBench API", version="0.1.0")

auth.load_local_env(override=False)

DEFAULT_ALLOWED_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"]


def get_allowed_origins() -> list[str]:
    configured_origins = os.getenv("ASSUREBENCH_ALLOWED_ORIGINS", "")
    origins = [origin.strip() for origin in configured_origins.split(",") if origin.strip()]
    return origins or DEFAULT_ALLOWED_ORIGINS


app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

class RunRequest(BaseModel):
    endpoint_url: str
    api_key: Optional[str] = None

    @field_validator("endpoint_url", mode="before")
    @classmethod
    def normalize_endpoint_url(cls, value):
        return str(value)

class RunResponse(BaseModel):
    run_id: str
    summary: dict
    details: list

class DemoPromptRequest(BaseModel):
    prompt: str
    test_id: Optional[str] = None

class ReportRequest(BaseModel):
    run_id: str
    summary: dict
    details: list
    endpoint_url: Optional[str] = None
    recommendations: Optional[list] = None
    risk_level: Optional[str] = None

class LoginRequest(BaseModel):
    email: str
    password: str

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str
    confirm_new_password: str

    @field_validator("current_password", "new_password", "confirm_new_password")
    @classmethod
    def password_required(cls, value):
        value = str(value)
        if not value.strip():
            raise ValueError("This field is required")
        return value

class UserCreateRequest(BaseModel):
    name: str
    email: str
    password: str
    role: str = "user"

    @field_validator("name", "email", "password")
    @classmethod
    def user_required_text(cls, value):
        value = str(value).strip()
        if not value:
            raise ValueError("This field is required")
        return value

    @field_validator("email")
    @classmethod
    def user_valid_email(cls, value):
        if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", value):
            raise ValueError("Enter a valid email address")
        return value

class UserUpdateRequest(BaseModel):
    role: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None

class AccessRequestCreate(BaseModel):
    full_name: str
    email: str
    company_or_project: Optional[str] = ""
    intended_use: str
    expected_usage: str
    message: Optional[str] = ""

    @field_validator("full_name", "email", "intended_use", "expected_usage")
    @classmethod
    def required_text(cls, value):
        value = str(value).strip()
        if not value:
            raise ValueError("This field is required")
        return value

    @field_validator("company_or_project", "message")
    @classmethod
    def optional_text(cls, value):
        return "" if value is None else str(value).strip()

    @field_validator("email")
    @classmethod
    def valid_email(cls, value):
        if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", value):
            raise ValueError("Enter a valid email address")
        return value

class AccessRequestUpdate(BaseModel):
    status: str

@app.on_event("startup")
async def startup_event():
    auth.initialize_auth_storage()

@app.get("/")
async def root():
    return {"service": "AssureBench", "status": "ok"}

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "AssureBench"}

@app.post("/auth/login")
async def login(request: LoginRequest):
    user = auth.authenticate_user(request.email, request.password)
    token = auth.create_access_token(user)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "name": user["name"],
            "id": user["id"],
            "email": user["email"],
            "role": user["role"],
            "force_password_change": user["force_password_change"],
        },
    }

@app.get("/auth/me")
async def me(current_user: dict = Depends(auth.get_current_user)):
    return {
        "name": current_user["name"],
        "id": current_user["id"],
        "email": current_user["email"],
        "role": current_user["role"],
        "is_active": current_user["is_active"],
        "force_password_change": current_user["force_password_change"],
    }

@app.post("/auth/change-password")
async def change_password(request: ChangePasswordRequest, current_user: dict = Depends(auth.get_current_user)):
    if request.new_password != request.confirm_new_password:
        raise HTTPException(status_code=400, detail="New passwords do not match")
    try:
        user = auth.change_own_password(current_user["id"], request.current_password, request.new_password)
        return {
            "message": "Password changed successfully",
            "user": {
                "name": user["name"],
                "email": user["email"],
                "role": user["role"],
                "is_active": user["is_active"],
                "force_password_change": user["force_password_change"],
            },
        }
    except PermissionError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="User not found")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

@app.post(
    "/access-requests",
    dependencies=[Depends(rate_limiter.rate_limit_dependency("/access-requests"))],
)
async def submit_access_request(request: AccessRequestCreate):
    access_request = auth.create_access_request(request.model_dump())
    return {
        "message": "Access request submitted. I will review your request and contact you with payment and login details.",
        "request": access_request,
    }

@app.post("/admin/users")
async def create_admin_user(request: UserCreateRequest, current_user: dict = Depends(auth.require_admin)):
    try:
        return auth.create_user_as_actor(
            current_user,
            name=request.name,
            email=request.email,
            password=request.password,
            role=request.role,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc))

@app.get("/admin/users")
async def list_admin_users(_: dict = Depends(auth.require_admin)):
    return {"users": auth.list_users()}

@app.patch("/admin/users/{user_id}")
async def patch_admin_user(user_id: int, request: UserUpdateRequest, current_user: dict = Depends(auth.require_admin)):
    try:
        return auth.update_user_as_actor(
            current_user,
            user_id,
            role=request.role,
            is_active=request.is_active,
            password=request.password,
        )
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="User not found")
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc))

@app.delete("/admin/users/{user_id}")
async def deactivate_admin_user(user_id: int, current_user: dict = Depends(auth.require_admin)):
    try:
        return auth.update_user_as_actor(current_user, user_id, is_active=False)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="User not found")
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc))

@app.get("/admin/access-requests")
async def list_admin_access_requests(_: dict = Depends(auth.require_admin)):
    return {"access_requests": auth.list_access_requests()}

@app.patch("/admin/access-requests/{request_id}")
async def patch_admin_access_request(request_id: int, request: AccessRequestUpdate, _: dict = Depends(auth.require_admin)):
    try:
        return auth.update_access_request_status(request_id, request.status)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Access request not found")

@app.post(
    "/runs",
    response_model=RunResponse,
    dependencies=[Depends(auth.get_current_user), Depends(rate_limiter.rate_limit_dependency("/runs"))],
)
async def run_tests(request: RunRequest):
    try:
        test_definitions = sample_tests.get_sample_tests()
        endpoint_url = str(request.endpoint_url)
        results = await test_runner.run_assurance_tests(
            endpoint_url, test_definitions, api_key=request.api_key
        )
        evaluated = evaluator.evaluate_responses(results)
        risk = ml_risk.compute_risk_score(evaluated, results)
        report = reports.build_report(endpoint_url, results, evaluated, risk)
        return {
            "run_id": report["run_id"],
            "summary": report["summary"],
            "details": report["details"],
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

@app.post(
    "/reports/json",
    dependencies=[Depends(auth.get_current_user), Depends(rate_limiter.rate_limit_dependency("/reports/json"))],
)
async def export_json_report(request: ReportRequest, current_user: dict = Depends(auth.get_current_user)):
    try:
        return reports.export_json_report(request.model_dump(), current_user)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

@app.post(
    "/reports/pdf",
    dependencies=[Depends(auth.get_current_user), Depends(rate_limiter.rate_limit_dependency("/reports/pdf"))],
)
async def export_pdf_report(request: ReportRequest, current_user: dict = Depends(auth.get_current_user)):
    try:
        return reports.export_pdf_report(request.model_dump(), current_user)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

@app.get("/reports")
async def list_reports(current_user: dict = Depends(auth.get_current_user)):
    try:
        return {"reports": reports.list_exported_reports(current_user)}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

@app.get("/reports/{filename}")
async def get_report_file(filename: str, current_user: dict = Depends(auth.get_current_user)):
    try:
        path = reports.get_exported_report_path(filename, current_user)
        media_type = "application/pdf" if path.suffix.lower() == ".pdf" else "application/json"
        return FileResponse(str(path), media_type=media_type, filename=path.name)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Report not found")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

@app.delete("/reports/{filename}")
async def delete_report_file(filename: str, current_user: dict = Depends(auth.get_current_user)):
    try:
        return reports.delete_exported_report(filename, current_user)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Report not found")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

@app.post("/demo-chatbot")
async def demo_chatbot_endpoint(request: DemoPromptRequest):
    return demo_chatbot.generate_demo_response(request.prompt, request.test_id)

@app.get("/demo-chatbot")
async def demo_chatbot_get():
    return {"message": "Send a POST request with { prompt: ... } to see demo chatbot behavior."}

@app.post("/safe-demo-chatbot")
async def safe_demo_chatbot_endpoint(request: DemoPromptRequest):
    return demo_chatbot.generate_safe_demo_response(request.prompt, request.test_id)

@app.get("/safe-demo-chatbot")
async def safe_demo_chatbot_get():
    return {"message": "Send a POST request with { prompt: ... } to see safe demo chatbot behavior."}

@app.post("/risky-demo-chatbot")
async def risky_demo_chatbot_endpoint(request: DemoPromptRequest):
    return demo_chatbot.generate_risky_demo_response(request.prompt, request.test_id)

@app.get("/risky-demo-chatbot")
async def risky_demo_chatbot_get():
    return {"message": "Send a POST request with { prompt: ... } to see risky demo chatbot behavior."}
