'use client';

interface CodeBlockProps {
  node: any;
  inline: boolean;
  className: string;
  children: any;
}

export function CodeBlock({
  node,
  inline,
  className,
  children,
  ...props
}: CodeBlockProps) {
  // Estrai il contenuto testuale per verificare se è una sola riga
  const textContent =
    typeof children === 'string'
      ? children
      : Array.isArray(children)
        ? children.join('')
        : String(children);

  // Verifica se il contenuto è di una sola riga (senza newlines)
  const isSingleLine =
    !textContent.includes('\n') && textContent.trim().length > 0;

  // Se non è inline ma è una sola riga, trattalo come inline
  const shouldRenderAsInline = inline || (!inline && isSingleLine);

  if (!shouldRenderAsInline) {
    return (
      <div className="not-prose flex flex-col">
        <div
          {...props}
          className={`text-sm w-full overflow-x-auto dark:bg-zinc-900 p-4 border border-zinc-200 dark:border-zinc-700 rounded-xl dark:text-zinc-50 text-zinc-900`}
        >
          <code className="whitespace-pre-wrap break-words block">
            {children}
          </code>
        </div>
      </div>
    );
  } else {
    return (
      <code
        className={`${className} text-sm bg-zinc-100 dark:bg-zinc-800 py-0.5 px-1 rounded-md`}
        {...props}
      >
        {children}
      </code>
    );
  }
}
