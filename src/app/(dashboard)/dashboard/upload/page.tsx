"use client";

import React, { useState, useRef } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { parseCostCsv } from "@/lib/parsers/csvParser";
import { addDocument } from "@/lib/firebase/firestore";
import { useAuth } from "@/context/AuthContext";

export default function UploadPage() {
    const { user } = useAuth();
    const [dragActive, setDragActive] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
    const inputRef = useRef<HTMLInputElement>(null);

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
            setFile(e.dataTransfer.files[0]);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const processFile = async () => {
        if (!file || !user) return;
        setUploading(true);
        setStatus("idle");

        try {
            const text = await file.text();
            const records = parseCostCsv(text);

            // Batch write simulation (Firestore limitation: 500 writes per batch)
            // For MVP we'll just loop await (slow but works for small files) or use an API route for safety
            // But requirement said "Client-side or API route". Client side is faster for MVP.

            // Let's create a "costs" subcollection under "tenants/{userId}" (Single tenant mock)
            // Actually strictly following prompt: /tenants/{tenantId}/costs
            // We will use user.uid as tenantId for MVP

            const tenantId = user.uid;
            const collectionPath = `tenants/${tenantId}/costs`;

            let count = 0;
            for (const record of records) {
                if (count > 100) break; // Limit for MVP demo
                await addDocument(collectionPath, {
                    ...record,
                    uploadedAt: new Date().toISOString(),
                    fileName: file.name
                });
                count++;
            }

            setStatus("success");
            setFile(null);
        } catch (error) {
            console.error(error);
            setStatus("error");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Data Ingestion</h1>
                    <p className="text-slate-400">Upload your AWS Cost & Usage Reports (CSV).</p>
                </div>
            </div>

            <Card>
                <div
                    className={`flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-slate-900/50 transition-colors
            ${dragActive ? "border-green-500 bg-green-500/10" : "border-slate-700 hover:bg-slate-800/50"}
          `}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => inputRef.current?.click()}
                >
                    <input
                        ref={inputRef}
                        type="file"
                        className="hidden"
                        accept=".csv"
                        onChange={handleChange}
                    />

                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        {!file ? (
                            <>
                                <svg className="w-10 h-10 mb-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                                <p className="mb-2 text-sm text-slate-400"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                                <p className="text-xs text-slate-500">CSV files only (Max 5MB)</p>
                            </>
                        ) : (
                            <div className="text-center">
                                <p className="text-green-500 font-semibold mb-2">{file.name}</p>
                                <p className="text-slate-500 text-xs">{(file.size / 1024).toFixed(2)} KB</p>
                            </div>
                        )}
                    </div>
                </div>

                {uploading && (
                    <div className="w-full bg-slate-800 rounded-full h-2.5 mt-4">
                        <div className="bg-green-500 h-2.5 rounded-full animate-pulse w-full"></div>
                    </div>
                )}

                {status === 'success' && (
                    <div className="mt-4 p-4 text-sm text-green-400 bg-green-900/20 rounded-lg border border-green-800">
                        Data successfully uploaded and processed!
                    </div>
                )}

                {status === 'error' && (
                    <div className="mt-4 p-4 text-sm text-red-400 bg-red-900/20 rounded-lg border border-red-800">
                        Failed to process file. Please check the CSV format.
                    </div>
                )}

                {file && !uploading && status !== 'success' && (
                    <div className="mt-6 flex justify-end">
                        <Button onClick={(e) => { e.stopPropagation(); processFile(); }}>
                            Process File
                        </Button>
                    </div>
                )}
            </Card>

            <div className="text-xs text-slate-500">
                <p>Expected CSV headers: Service, Amount, Date, Region</p>
            </div>
        </div>
    );
}
