import chromadb
from chromadb.utils import embedding_functions
import os
import json
policy_dir = "c:/Users/konid/Downloads/pseudo_stress_test_dataset/pseudo_dataset/policies"
policy_files = [f for f in os.listdir(policy_dir) if f.endswith(".md")]
client = chromadb.Client()
collection = client.get_or_create_collection(name="policy_collection")
for fname in policy_files:
    with open(os.path.join(policy_dir, fname), "r", encoding="utf-8") as f:
        doc_text = f.read()
    collection.upsert(
        documents=[doc_text],
        ids=[fname]
    )
# 2. Extract all questions from incoming questionnaires
questionnaire_dir = "c:/Users/konid/Downloads/pseudo_stress_test_dataset/pseudo_dataset/incoming_questionnaires"
question_files = [f for f in os.listdir(questionnaire_dir) if f.endswith(".json")]
all_questions = []
for fname in question_files:
    with open(os.path.join(questionnaire_dir, fname), "r", encoding="utf-8") as f:
        data = json.load(f)
        for q in data.get("questions", []):
            question = q["q"]
            print(question)
            result = collection.query(
                query_texts=question,
                n_results=1
            )
            print(result["documents"])
