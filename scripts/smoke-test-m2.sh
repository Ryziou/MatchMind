#!/usr/bin/env bash
# Anonymous fixture only. No personal files or paths are referenced.
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3001}"
TMP_DIR="$(mktemp -d)"
DOCX="$TMP_DIR/sample-cv.docx"

mkdir -p "$TMP_DIR/word" "$TMP_DIR/_rels"
cat > "$TMP_DIR/[Content_Types].xml" <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-officedocument.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>
EOF
cat > "$TMP_DIR/_rels/.rels" <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>
EOF
cat > "$TMP_DIR/word/document.xml" <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>Experience</w:t></w:r></w:p>
    <w:p><w:r><w:t>Built RAG pipelines with TypeScript, Node.js, and vector databases.</w:t></w:r></w:p>
    <w:p><w:r><w:t>Skills</w:t></w:r></w:p>
    <w:p><w:r><w:t>React, Express, Docker, ChromaDB, Gemini embeddings.</w:t></w:r></w:p>
  </w:body>
</w:document>
EOF

(
  cd "$TMP_DIR"
  zip -qr "$DOCX" '[Content_Types].xml' _rels word
)

echo "Uploading anonymous sample CV..."
CREATE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/sessions" \
  -F "cv=@$DOCX;type=application/vnd.openxmlformats-officedocument.wordprocessingml.document")
echo "$CREATE_RESPONSE" | python3 -m json.tool

SESSION_ID=$(echo "$CREATE_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['sessionId'])")
rm -rf "$TMP_DIR"

echo ""
echo "Running analysis for session $SESSION_ID..."

curl -s -N -X POST "$BASE_URL/api/sessions/${SESSION_ID}/analyze" \
  -H "Content-Type: application/json" \
  -d '{"jobDescription":"Looking for a TypeScript developer with React, Node.js, Docker, and RAG experience."}'

echo ""
echo "M2 smoke test finished."
