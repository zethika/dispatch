import { useState } from 'react';
import { Button } from '@heroui/react';

type TokenType = 'key' | 'string' | 'number' | 'boolean' | 'null' | 'punctuation' | 'whitespace';

interface Token {
  type: TokenType;
  value: string;
}

const TOKEN_REGEX =
  /("(?:[^"\\]|\\.)*")|(\b-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b)|(true|false)|(null)|([{}\[\],:])|(\s+)/g;

const TOKEN_COLORS: Record<TokenType, string> = {
  key: 'text-blue-400',
  string: 'text-green-400',
  number: 'text-yellow-400',
  boolean: 'text-purple-400',
  null: 'text-gray-500',
  punctuation: 'text-default-500',
  whitespace: '',
};

function tokenizeJson(json: string): Token[] {
  const tokens: Token[] = [];
  let lastIndex = 0;
  TOKEN_REGEX.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = TOKEN_REGEX.exec(json)) !== null) {
    // Handle any unmatched characters before this match
    if (match.index > lastIndex) {
      tokens.push({ type: 'punctuation', value: json.slice(lastIndex, match.index) });
    }

    const [full, str, num, bool, nul, punct, ws] = match;
    if (ws !== undefined) {
      tokens.push({ type: 'whitespace', value: full });
    } else if (num !== undefined) {
      tokens.push({ type: 'number', value: full });
    } else if (bool !== undefined) {
      tokens.push({ type: 'boolean', value: full });
    } else if (nul !== undefined) {
      tokens.push({ type: 'null', value: full });
    } else if (punct !== undefined) {
      tokens.push({ type: 'punctuation', value: full });
    } else if (str !== undefined) {
      tokens.push({ type: 'string', value: full });
    }

    lastIndex = match.index + full.length;
  }

  // Any remaining unmatched characters
  if (lastIndex < json.length) {
    tokens.push({ type: 'punctuation', value: json.slice(lastIndex) });
  }

  // Post-process: strings followed by ':' (skipping whitespace) become keys
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].type === 'string') {
      let j = i + 1;
      while (j < tokens.length && tokens[j].type === 'whitespace') {
        j++;
      }
      if (j < tokens.length && tokens[j].type === 'punctuation' && tokens[j].value === ':') {
        tokens[i] = { ...tokens[i], type: 'key' };
      }
    }
  }

  return tokens;
}

interface JsonViewerProps {
  body: string;
}

export default function JsonViewer({ body }: JsonViewerProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(body);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Large response guard (Pitfall 5): skip tokenizer for responses > 100KB
  const isLarge = body.length > 102400;

  let isJson = false;
  let formattedJson = '';

  if (!isLarge) {
    try {
      const parsed = JSON.parse(body);
      formattedJson = JSON.stringify(parsed, null, 2);
      isJson = true;
    } catch {
      isJson = false;
    }
  }

  const renderContent = () => {
    if (isLarge) {
      return (
        <>
          <p className="text-default-400 text-xs italic mb-2">
            Response body is large (&gt;100KB). Showing raw text.
          </p>
          <pre className="font-mono text-sm whitespace-pre-wrap break-words text-foreground">
            {body}
          </pre>
        </>
      );
    }

    if (isJson) {
      const tokens = tokenizeJson(formattedJson);
      return (
        <pre className="font-mono text-sm whitespace-pre-wrap break-words">
          {tokens.map((token, i) => {
            const colorClass = TOKEN_COLORS[token.type];
            if (!colorClass) {
              return token.value;
            }
            return (
              <span key={i} className={colorClass}>
                {token.value}
              </span>
            );
          })}
        </pre>
      );
    }

    return (
      <pre className="font-mono text-sm whitespace-pre-wrap break-words text-foreground">
        {body}
      </pre>
    );
  };

  return (
    <div className="relative">
      <Button
        isIconOnly
        size="sm"
        variant="light"
        className="absolute top-0 right-0 z-10"
        onPress={handleCopy}
        aria-label="Copy response body"
      >
        <span className="text-xs">{copied ? 'Copied!' : 'Copy'}</span>
      </Button>
      <div className="pt-1">{renderContent()}</div>
    </div>
  );
}
