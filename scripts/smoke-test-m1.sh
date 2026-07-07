#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP_DIR="$(mktemp -d)"
DOCX="$TMP_DIR/test-cv.docx"

mkdir -p "$TMP_DIR/word" "$TMP_DIR/_rels"
cat > "$TMP_DIR/[Content_Types].xml" <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>
EOF
cat > "$TMP_DIR/_rels/.rels" <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>
EOF
cat > "$TMP_DIR/word/document.xml" <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>Experience</w:t></w:r></w:p>
    <w:p><w:r><w:t>Senior engineer building RAG pipelines with TypeScript, Python, and Gemini embeddings.</w:t></w:r></w:p>
    <w:p><w:r><w:t>Skills</w:t></w:r></w:p>
    <w:p><w:r><w:t>React, Node.js, Docker, ChromaDB, vector search, prompt engineering.</w:t></w:r></w:p>
    <w:p><w:r><w:t>Education</w:t></w:r></w:p>
    <w:p><w:r><w:t>BSc Computer Science.</w:t></w:r></w:p>
  </w:body>
</w:document>
EOF

(
  cd "$TMP_DIR"
  zip -qr "$DOCX" '[Content_Types].xml' _rels word
)

echo "Created $DOCX"

if curl -sf http://localhost:3001/api/health >/dev/null 2>&1; then
  BASE_URL="http://localhost:3001"
else
  echo "Starting local dev server..."
  npm run dev --workspace=@matchmind/server >/tmp/matchmind-server.log 2>&1 &
  SERVER_PID=$!
  trap 'kill $SERVER_PID 2>/dev/null || true' EXIT
  for _ in $(seq 1 30); do
    if curl -sf http://localhost:3001/api/health >/dev/null 2>&1; then
      break
    fi
    sleep 1
  done
  BASE_URL="http://localhost:3001"
fi

echo "Uploading CV to $BASE_URL/api/sessions"
CREATE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/sessions" -F "cv=@$DOCX;type=application/vnd.openxmlformats-officedocument.wordprocessingml.document")
echo "$CREATE_RESPONSE" | python3 -m json.tool

SESSION_ID=$(echo "$CREATE_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['sessionId'])")
QUERY_RESPONSE=$(curl -s "$BASE_URL/api/sessions/$SESSION_ID/debug/query?q=vector%20search%20experience")
echo "$QUERY_RESPONSE" | python3 -m json.tool

RESULT_COUNT=$(echo "$QUERY_RESPONSE" | python3 -c "import sys, json; print(len(json.load(sys.stdin)['results']))")
if [ "$RESULT_COUNT" -gt 0 ]; then
  echo "M1 smoke test passed: $RESULT_COUNT retrieved chunks"
else
  echo "M1 smoke test failed: no retrieved chunks"
  exit 1
fi

rm -rf "$TMP_DIR"
