# Pseudo Stress-Test Dataset

Generated: 2025-08-09T21:41:25Z

## Contents
- policies/ — 4 policy documents in Markdown with section numbers
- incoming_questionnaires/ — 10 JSON files (clients -> Pseudo) with answers, confidence, evidence, and proof bundles
- outgoing_questionnaires/ — 10 JSON files (Pseudo -> vendors) with vendor responses and heuristic evaluations
- meta/dataset_master.json — index of all files with relative paths

## Usage
- Ingest `policies/*.md` into your vector store.
- Feed `incoming_questionnaires/*.json` to your auto-answerer. Validate `confidence` against actual correctness.
- Score `outgoing_questionnaires/*.json` with your evaluator. Compare with the provided `quality_estimate` and `evaluation`.
