'use client';

import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { useImperativeHandle, forwardRef } from 'react';
import { contentToHtml } from '@/lib/poemHtml';

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

// Re-exported so existing editor imports keep working; the implementation lives
// in lib/poemHtml so the email renderer applies the same conversion.
export { contentToHtml };

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
      className={`px-3 py-1.5 min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 text-sm font-medium rounded transition-colors flex items-center justify-center ${
        isActive
          ? 'bg-accent text-white'
          : 'bg-surface-secondary text-primary hover:bg-hover'
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
      // Preserve leading/indentation spaces and blank lines when loading a poem
      // into edit mode. Without this ProseMirror collapses whitespace on parse.
      parseOptions: {
        preserveWhitespace: 'full',
      },
      editorProps: {
        attributes: {
          class: `prose prose-lg max-w-none focus:outline-none whitespace-pre-wrap font-serif`,
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
          <div className="flex gap-1 pb-3 mb-3 border-b border-border">
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
          className={`[&_.ProseMirror]:outline-none [&_.ProseMirror]:text-primary ${className}`}
          style={{ minHeight }}
        />
      </div>
    );
  }
);
