from typing import Optional

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, field_validator

from . import sample_tests, evaluator, ml_risk, demo_chatbot, reports, test_runner, rate_limiter

app = FastAPI(title="AssureBench API", version="0.1.0")

origins = ["http://localhost:5173", "http://127.0.0.1:5173"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["GET", "POST", "OPTIONS"],
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

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "AssureBench"}

@app.post(
    "/runs",
    response_model=RunResponse,
    dependencies=[Depends(rate_limiter.rate_limit_dependency("/runs"))],
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
    dependencies=[Depends(rate_limiter.rate_limit_dependency("/reports/json"))],
)
async def export_json_report(request: ReportRequest):
    try:
        return reports.export_json_report(request.model_dump())
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

@app.post(
    "/reports/pdf",
    dependencies=[Depends(rate_limiter.rate_limit_dependency("/reports/pdf"))],
)
async def export_pdf_report(request: ReportRequest):
    try:
        return reports.export_pdf_report(request.model_dump())
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

@app.get("/reports")
async def list_reports():
    try:
        return {"reports": reports.list_exported_reports()}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

@app.get("/reports/{filename}")
async def get_report_file(filename: str):
    try:
        path = reports.get_exported_report_path(filename)
        media_type = "application/pdf" if path.suffix.lower() == ".pdf" else "application/json"
        return FileResponse(str(path), media_type=media_type, filename=path.name)
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
