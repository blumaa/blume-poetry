'use client';

import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { useImperativeHandle, forwardRef } from 'react';

export interface RichTextEditorRef {
  getHTML: () => string;
  getText: () => string;
  getEditor: () => Editor | null;
}

export interface RichTextEditorProps {
  content?: string;
  onChange?: (html: string, text: string) => void;
  placeholder?: string;
  minHeight?: string;
  className?: string;
  showToolbar?: boolean;
}

// Convert plain text to HTML for Tiptap editor
export function contentToHtml(content: string): string {
  if (!content) return '';

  // If it already looks like HTML, return as-is
  if (content.trim().startsWith('<')) {
    return content;
  }

  // Convert plain text with newlines to HTML paragraphs
  // Preserve tabs and multiple spaces using &nbsp;
  return content
    .split('\n')
    .map(line => {
      if (!line) return '<p><br></p>';

      // Convert tabs to 4 non-breaking spaces
      let processed = line.replace(/\t/g, '\u00A0\u00A0\u00A0\u00A0');

      // Convert multiple spaces to non-breaking spaces (preserve indentation)
      processed = processed.replace(/ {2,}/g, (match) =>
        '\u00A0'.repeat(match.length)
      );

      // Convert leading spaces to non-breaking spaces
      processed = processed.replace(/^( +)/, (match) =>
        '\u00A0'.repeat(match.length)
      );

      return `<p>${processed}</p>`;
    })
    .join('');
}

// Toolbar button component
function ToolbarButton({
  onClick,
  isActive,
  children,
  title,
}: {
  onClick: () => void;
  isActive: boolean;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
        isActive
          ? 'bg-[var(--accent)] text-white'
          : 'bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
      }`}
    >
      {children}
    </button>
  );
}

export const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(
  function RichTextEditor({ content = '', onChange, minHeight = '300px', className = '', showToolbar = true }, ref) {
    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          // Disable features we don't need for poetry/newsletters
          heading: false,
          bulletList: false,
          orderedList: false,
          blockquote: false,
          codeBlock: false,
          horizontalRule: false,
        }),
        Underline,
      ],
      content: contentToHtml(content),
      editorProps: {
        attributes: {
          class: `prose prose-lg max-w-none focus:outline-none whitespace-pre-wrap font-[var(--font-serif)]`,
          style: `min-height: ${minHeight}`,
        },
      },
      immediatelyRender: false,
      onUpdate: ({ editor }) => {
        if (onChange) {
          onChange(editor.getHTML(), editor.getText());
        }
      },
    });

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      getHTML: () => editor?.getHTML() || '',
      getText: () => editor?.getText() || '',
      getEditor: () => editor,
    }));

    return (
      <div className="flex flex-col">
        {/* Toolbar */}
        {showToolbar && editor && (
          <div className="flex gap-1 pb-3 mb-3 border-b border-[var(--border)]">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              isActive={editor.isActive('bold')}
              title="Bold (Ctrl+B)"
            >
              <strong>B</strong>
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              isActive={editor.isActive('italic')}
              title="Italic (Ctrl+I)"
            >
              <em>I</em>
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              isActive={editor.isActive('underline')}
              title="Underline (Ctrl+U)"
            >
              <u>U</u>
            </ToolbarButton>
          </div>
        )}

        <EditorContent
          editor={editor}
          className={`[&_.ProseMirror]:outline-none [&_.ProseMirror]:text-[var(--text-primary)] ${className}`}
          style={{ minHeight }}
        />
      </div>
    );
  }
);
