"""
FastAPI wrapper for FOCUS Validator service.
Provides REST API for validating FOCUS-compliant cost data.
"""

import tempfile
import os
from typing import Optional
from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import polars as pl

from focus_validator.validator import Validator

app = FastAPI(
    title="FOCUS Validator Service",
    description="Validates cloud cost data against FOCUS specification",
    version="1.0.0",
)

# CORS for Next.js app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ValidationError(BaseModel):
    rule_id: str
    rule_name: str
    column: Optional[str] = None
    error_message: str
    violation_count: int


class ValidationResult(BaseModel):
    valid: bool
    total_rows: int
    rules_checked: int
    rules_passed: int
    rules_failed: int
    errors: list[ValidationError]
    summary: str


class HealthResponse(BaseModel):
    status: str
    version: str


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint for Railway."""
    return HealthResponse(status="healthy", version="1.0.0")


@app.post("/validate", response_model=ValidationResult)
async def validate_focus_file(
    file: UploadFile = File(...),
    version: str = Query(default="1.2", description="FOCUS version to validate against"),
):
    """
    Validate a FOCUS-compliant CSV file.

    Returns validation results with any failures.
    Only failed rules are included in the response.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    if not file.filename.endswith(('.csv', '.parquet')):
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Only CSV and Parquet files are supported."
        )

    # Save uploaded file to temp location
    with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        # Count rows for reporting
        if file.filename.endswith('.csv'):
            df = pl.read_csv(tmp_path)
        else:
            df = pl.read_parquet(tmp_path)
        total_rows = len(df)
        del df  # Free memory

        # Run validation
        validator = Validator(
            data_filename=tmp_path,
            output_type="console",
            output_destination=None,
            rules_version=version,
            focus_dataset="CostAndUsage",
        )

        results = validator.validate()

        # Process results - only collect failures
        errors = []
        rules_passed = 0
        rules_failed = 0
        rules_skipped = 0

        if results and hasattr(results, 'by_rule_id'):
            for rule_id, entry in results.by_rule_id.items():
                details = entry.get("details") or {}

                # Check if skipped
                if details.get("skipped"):
                    rules_skipped += 1
                    continue

                # Check pass/fail
                if entry.get("ok"):
                    rules_passed += 1
                else:
                    rules_failed += 1

                    # Get rule info if available
                    rule_info = results.rules.get(rule_id)
                    rule_name = rule_id
                    column = None

                    if rule_info:
                        rule_name = getattr(rule_info, 'name', rule_id) or rule_id
                        column = getattr(rule_info, 'column', None)

                    # Build error message
                    error_msg = details.get("message") or details.get("reason") or "Validation failed"
                    violation_count = details.get("violations", 0)

                    error = ValidationError(
                        rule_id=rule_id,
                        rule_name=rule_name,
                        column=column,
                        error_message=str(error_msg),
                        violation_count=violation_count,
                    )
                    errors.append(error)

        rules_checked = rules_passed + rules_failed
        valid = rules_failed == 0

        if valid:
            summary = f"All {rules_passed} validation rules passed for {total_rows:,} rows."
        else:
            summary = f"{rules_failed} of {rules_checked} rules failed. Please fix the errors and re-upload."

        return ValidationResult(
            valid=valid,
            total_rows=total_rows,
            rules_checked=rules_checked,
            rules_passed=rules_passed,
            rules_failed=rules_failed,
            errors=errors,
            summary=summary,
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Validation error: {str(e)}"
        )
    finally:
        # Cleanup temp file
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


@app.get("/supported-versions")
async def get_supported_versions():
    """Get list of supported FOCUS versions."""
    return {
        "versions": ["1.0", "1.1", "1.2"],
        "default": "1.2",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
