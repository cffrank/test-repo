"""
FastAPI wrapper for FOCUS Validator service.
Provides REST API for validating FOCUS-compliant cost data.
"""

import tempfile
import os
import json
from typing import Optional
from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import polars as pl

from focus_validator.validator import Validator
from focus_validator.config_objects.rule import CheckResult

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
    column: Optional[str]
    error_message: str
    violation_count: int
    sample_values: Optional[list] = None


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
            output_type="console",  # We'll process results ourselves
            output_destination=None,
            rules_version=version,
        )

        results = validator.validate()

        # Process results - only collect failures
        errors = []
        rules_passed = 0
        rules_failed = 0
        rules_checked = 0

        if results and hasattr(results, 'check_results'):
            for check_result in results.check_results:
                rules_checked += 1

                if check_result.status == CheckResult.PASSED:
                    rules_passed += 1
                elif check_result.status == CheckResult.FAILED:
                    rules_failed += 1

                    # Extract error details
                    error = ValidationError(
                        rule_id=check_result.rule_id or "unknown",
                        rule_name=check_result.rule_name or check_result.rule_id or "Unknown Rule",
                        column=check_result.column_name,
                        error_message=check_result.error_message or "Validation failed",
                        violation_count=check_result.violation_count or 0,
                        sample_values=check_result.sample_values[:5] if check_result.sample_values else None,
                    )
                    errors.append(error)

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
