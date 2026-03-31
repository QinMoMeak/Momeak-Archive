import ReactMarkdown from "react-markdown";

type MarkdownContentProps = {
  content: string;
};

export function MarkdownContent({ content }: MarkdownContentProps) {
  return (
    <div className="space-y-4 text-[15px] leading-7 text-slate-700">
      <ReactMarkdown
        components={{
          h1: ({ children }) => (
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mt-6 text-xl font-semibold text-slate-900">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-5 text-base font-semibold text-slate-900">
              {children}
            </h3>
          ),
          p: ({ children }) => <p className="text-slate-700">{children}</p>,
          ul: ({ children }) => (
            <ul className="list-disc space-y-2 pl-5 text-slate-700">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal space-y-2 pl-5 text-slate-700">{children}</ol>
          ),
          li: ({ children }) => <li className="pl-1">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="rounded-r-2xl border-l-2 border-slate-300 bg-slate-50 px-4 py-3 text-slate-600">
              {children}
            </blockquote>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-slate-900 underline decoration-slate-300 underline-offset-4 hover:decoration-slate-500"
            >
              {children}
            </a>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-slate-900">{children}</strong>
          ),
          code: ({ children }) => (
            <code className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[13px] text-slate-800">
              {children}
            </code>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
