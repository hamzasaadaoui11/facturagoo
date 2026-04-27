import React, { useRef } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}

const modules = {
    toolbar: [
        ['bold', 'italic', 'underline'],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'size': ['small', false, 'large', 'huge'] }],
        ['clean']
    ],
};

const formats = [
    'bold', 'italic', 'underline',
    'color', 'background',
    'size'
];

const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, placeholder, className }) => {
    const quillRef = useRef<ReactQuill>(null);

    return (
        <div 
            className={`rich-text-editor ${className || ''} rounded-xl overflow-hidden border border-slate-200 focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 transition-all`}
        >
            <ReactQuill 
                ref={quillRef}
                theme="snow"
                value={value || ''}
                onChange={onChange}
                modules={modules}
                formats={formats}
                placeholder={placeholder}
            />
            <style>{`
                .rich-text-editor .ql-container {
                    border: none !important;
                    border-bottom-left-radius: 0.75rem;
                    border-bottom-right-radius: 0.75rem;
                    font-size: 13px;
                    background: white;
                }
                .rich-text-editor .ql-toolbar {
                    border: none !important;
                    border-bottom: 1px solid #e2e8f0 !important;
                    padding: 6px 10px;
                    background: #f8fafc;
                }
                .rich-text-editor .ql-editor {
                    min-height: 80px;
                    padding: 12px 16px;
                }
                .rich-text-editor .ql-editor.ql-blank::before {
                    left: 16px;
                    font-style: normal;
                    color: #94a3b8;
                    font-size: 13px;
                }
            `}</style>
        </div>
    );
};

export default RichTextEditor;
