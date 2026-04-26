import React from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, placeholder, className }) => {
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

    return (
        <div className={`rich-text-editor ${className || ''}`}>
            <ReactQuill 
                theme="snow"
                value={value}
                onChange={onChange}
                modules={modules}
                formats={formats}
                placeholder={placeholder}
            />
            <style>{`
                .rich-text-editor .ql-container {
                    border-bottom-left-radius: 0.75rem;
                    border-bottom-right-radius: 0.75rem;
                    font-size: 11px;
                }
                .rich-text-editor .ql-toolbar {
                    border-top-left-radius: 0.75rem;
                    border-top-right-radius: 0.75rem;
                    padding: 4px 8px;
                    background: #f8fafc;
                }
                .rich-text-editor .ql-editor {
                    min-height: 48px;
                    padding: 8px 12px;
                }
            `}</style>
        </div>
    );
};

export default RichTextEditor;
