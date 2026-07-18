#!/bin/bash
# Quick task add script - accepts JSON as argument or from stdin
# Usage:
#   ./add-task.sh '{"title":"My task","priority":"high","categoryId":"work"}'
#   echo '{"title":"My task"}' | ./add-task.sh

API_URL="https://omar-life-planner.vercel.app/api/tasks"

if [ -n "$1" ]; then
  JSON="$1"
else
  JSON=$(cat)
fi

if [ -z "$JSON" ]; then
  echo "Error: No JSON provided"
  echo "Usage: ./add-task.sh '{\"title\":\"My task\",\"priority\":\"high\"}'"
  exit 1
fi

RESPONSE=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "$JSON")

echo "$RESPONSE" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if data.get('success'):
        task = data['task']
        print(f\"Added: {task['title']} (ID: {task['id'][:8]}...)\")
        if task.get('deadline'):
            print(f\"  Deadline: {task['deadline']}\")
        print(f\"  Priority: {task['priority']} | Category: {task['categoryId']}\")
    else:
        print(f\"Error: {data.get('error', 'Unknown error')}\")
except:
    print(sys.stdin.read())
" 2>/dev/null || echo "$RESPONSE"
