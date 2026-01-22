"use client";

import React, { useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { parseCostCsv } from "@/lib/parsers/csvParser";
import { useAuth } from "@/context/AuthContext";

interface ValidationError {
  rule_id: string;
  rule_name: string;
  column: string | null;
  error_message: string;
  violation_count: number;
}

interface ValidationResult {
  valid: boolean;
  total_rows: number;
  rules_checked: number;
  rules_passed: number;
  rules_failed: number;
  errors: ValidationError[];
  summary: string;
}

type UploadStep = "idle" | "validating" | "validated" | "uploading" | "success" | "error";

export default function UploadPage() {
  const { user } = useAuth();
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<UploadStep>("idle");
  const [error, setError] = useState("");
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const validatorUrl = process.env.NEXT_PUBLIC_VALIDATOR_URL || "http://localhost:8000";

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    setStep("idle");
    setValidationResult(null);
    setError("");
  };

  const validateFile = async () => {
    if (!file) return;

    setStep("validating");
    setError("");
    setValidationResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${validatorUrl}/validate?version=1.2`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Validation service unavailable");
      }

      const result: ValidationResult = await response.json();
      setValidationResult(result);
      setStep("validated");

    } catch (err: any) {
      console.error("Validation error:", err);
      setError(err.message || "Failed to validate file");
      setStep("error");
    }
  };

  const uploadFile = async () => {
    if (!file || !user || !validationResult?.valid) return;

    setStep("uploading");
    setError("");
    setUploadProgress(0);

    try {
      const text = await file.text();
      const records = parseCostCsv(text);

      const allExpenses = records.map((record: any) => ({
        amount: Number(record.amount) || 0,
        currency: record.currency || "USD",
        date: record.date ? new Date(record.date).toISOString() : new Date().toISOString(),
        category: record.category || "Unknown",
        service: record.service || "Unknown",
        accountId: record.account || "default",
        region: record.region || "global",
      }));

      const BATCH_SIZE = 500;
      const totalBatches = Math.ceil(allExpenses.length / BATCH_SIZE);

      for (let i = 0; i < allExpenses.length; i += BATCH_SIZE) {
        const batch = allExpenses.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;

        const response = await fetch("/api/expenses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: user.id,
            expenses: batch,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || `Failed to upload batch ${batchNum}`);
        }

        setUploadProgress(Math.round((batchNum / totalBatches) * 100));
      }

      setStep("success");
      setFile(null);
      setValidationResult(null);
    } catch (err: any) {
      console.error("Upload error:", err);
      setError(err.message);
      setStep("error");
    }
  };

  const resetUpload = () => {
    setFile(null);
    setStep("idle");
    setValidationResult(null);
    setError("");
    setUploadProgress(0);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Data Ingestion</h1>
          <p className="text-slate-400">Upload your FOCUS-compliant AWS Cost & Usage Reports.</p>
        </div>
      </div>

      <Card>
        <div
          className={`flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-slate-900/50 transition-colors
            ${dragActive ? "border-green-500 bg-green-500/10" : "border-slate-700 hover:bg-slate-800/50"}
            ${step !== "idle" && step !== "validated" ? "pointer-events-none opacity-50" : ""}
          `}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => step === "idle" && inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept=".csv,.parquet"
            onChange={handleChange}
          />

          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            {!file ? (
              <>
                <svg
                  className="w-10 h-10 mb-3 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <p className="mb-2 text-sm text-slate-400">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-slate-500">FOCUS-compliant CSV or Parquet files</p>
              </>
            ) : (
              <div className="text-center">
                <p className="text-green-500 font-semibold mb-2">{file.name}</p>
                <p className="text-slate-500 text-xs">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            )}
          </div>
        </div>

        {/* Validation Progress */}
        {step === "validating" && (
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-blue-400">Validating against FOCUS specification...</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2">
              <div className="bg-blue-500 h-2 rounded-full animate-pulse w-full" />
            </div>
          </div>
        )}

        {/* Validation Results */}
        {step === "validated" && validationResult && (
          <div className="mt-4 space-y-4">
            {validationResult.valid ? (
              <div className="p-4 bg-green-900/20 rounded-lg border border-green-800">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-green-400 font-medium">Validation Passed</span>
                </div>
                <p className="text-sm text-green-300">{validationResult.summary}</p>
                <div className="mt-2 flex gap-4 text-xs text-slate-400">
                  <span>{validationResult.total_rows.toLocaleString()} rows</span>
                  <span>{validationResult.rules_passed} rules passed</span>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-red-900/20 rounded-lg border border-red-800">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span className="text-red-400 font-medium">Validation Failed</span>
                </div>
                <p className="text-sm text-red-300 mb-3">{validationResult.summary}</p>

                {/* Error Details */}
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {validationResult.errors.map((err, idx) => (
                    <div key={idx} className="p-3 bg-slate-900/50 rounded border border-slate-700">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-200">{err.rule_name}</p>
                          <p className="text-xs text-slate-400 mt-1">{err.error_message}</p>
                        </div>
                        <span className="text-xs text-red-400 bg-red-900/30 px-2 py-1 rounded">
                          {err.violation_count.toLocaleString()} violations
                        </span>
                      </div>
                      {err.column && (
                        <p className="text-xs text-slate-500 mt-1">Column: {err.column}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Upload Progress */}
        {step === "uploading" && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-400">Uploading to database...</span>
              <span className="text-sm text-green-400">{uploadProgress}%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Success Message */}
        {step === "success" && (
          <div className="mt-4 p-4 text-sm text-green-400 bg-green-900/20 rounded-lg border border-green-800">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              Data successfully validated and uploaded!
            </div>
          </div>
        )}

        {/* Error Message */}
        {step === "error" && (
          <div className="mt-4 p-4 text-sm text-red-400 bg-red-900/20 rounded-lg border border-red-800">
            {error || "An error occurred. Please try again."}
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex justify-end gap-3">
          {(step === "validated" || step === "error" || step === "success") && (
            <Button
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                resetUpload();
              }}
            >
              {step === "success" ? "Upload Another" : "Start Over"}
            </Button>
          )}

          {file && step === "idle" && (
            <Button
              onClick={(e) => {
                e.stopPropagation();
                validateFile();
              }}
            >
              Validate File
            </Button>
          )}

          {step === "validated" && validationResult?.valid && (
            <Button
              onClick={(e) => {
                e.stopPropagation();
                uploadFile();
              }}
            >
              Upload to Database
            </Button>
          )}
        </div>
      </Card>

      <div className="text-xs text-slate-500 space-y-1">
        <p>Supported format: FOCUS (FinOps Open Cost and Usage Specification) v1.2</p>
        <p>Required columns: BilledCost, ServiceName, ChargePeriodStart, RegionName</p>
      </div>
    </div>
  );
}
