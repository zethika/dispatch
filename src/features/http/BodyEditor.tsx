import type { RequestBody } from '../../types/collections';

// TODO: CSS-based JSON highlighting overlay for body input

interface BodyEditorProps {
  body: RequestBody | null;
  onChange: (body: RequestBody | null) => void;
}

export default function BodyEditor({ body, onChange }: BodyEditorProps) {
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const content = e.target.value;
    if (content === '') {
      onChange(null);
    } else {
      onChange({ type: 'json', content });
    }
  };

  return (
    <textarea
      className="w-full h-full min-h-[120px] bg-content2 text-foreground font-mono text-sm p-3 rounded-lg border border-default-200 focus:border-primary focus:outline-none resize-y"
      placeholder={'{\n  "key": "value"\n}'}
      value={body?.content ?? ''}
      onChange={handleChange}
    />
  );
}
