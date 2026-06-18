from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.services.ai_service import AIService

router = APIRouter()
ai_service = AIService()


@router.post("/generate-report")
def generate_report(
    project_id: int = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = ai_service.generate_report(project_id, db)
    return {"report": result}


@router.post("/ask")
def ask_question(
    question: str = Body(..., embed=True),
    project_id: int = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = ai_service.ask_question(question, project_id, db)
    return {"answer": result}


@router.get("/predict-completion")
def predict_completion(
    project_id: int = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ai_service.predict_completion(project_id, db)


@router.get("/forecast-materials")
def forecast_materials(
    project_id: int = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ai_service.forecast_materials(project_id, db)


@router.get("/forecast-cost")
def forecast_cost(
    project_id: int = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ai_service.forecast_cost(project_id, db)


@router.get("/detect-risks")
def detect_risks(
    project_id: int = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ai_service.detect_risks(project_id, db)
