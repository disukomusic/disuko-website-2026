import React, { useState } from 'react';
import dynamic from 'next/dynamic';

const ReactQuill = dynamic(() => import('react-quill'), {
    ssr: false,
    loading: () => <div style={{ height: '350px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading editor...</div>
});

// The CSS can stay as a normal import
import 'react-quill/dist/quill.snow.css';

// We expose new className props so Plasmic can style these individual pieces
export function BlogAdmin({
                              apiEndpoint,
                              className,
                              formClassName,
                              inputClassName,
                              buttonClassName,
                              titleClassName,
                              messageClassName
                          }: any) {
    const [token, setToken] = useState(localStorage.getItem('adminToken') || '');
    const [password, setPassword] = useState('');
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [status, setStatus] = useState(''); // 'error', 'success', 'loading'

    // New state to toggle between visual editor and raw markdown text area
    const [editorMode, setEditorMode] = useState<'visual' | 'markdown'>('visual');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('loading');
        try {
            const res = await fetch(`${apiEndpoint}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });
            if (res.ok) {
                const data = await res.json();
                setToken(data.token);
                localStorage.setItem('adminToken', data.token);
                setStatus('');
            } else {
                setStatus('error');
            }
        } catch (err) {
            setStatus('error');
        }
    };

    const handlePublish = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !content) return alert("Title and Content are required.");

        setStatus('loading');
        try {
            const res = await fetch(`${apiEndpoint}/api/posts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ title, markdown: content })
            });
            if (res.ok) {
                setStatus('success');
                setTitle('');
                setContent('');
            } else {
                setStatus('error');
            }
        } catch (err) {
            setStatus('error');
        }
    };

    // Reads a local .md file and populates the content state
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            if (event.target?.result) {
                setContent(event.target.result as string);
                setEditorMode('markdown'); // Switch to markdown mode automatically
            }
        };
        reader.readAsText(file);

        // Reset the input value so the same file can be uploaded again if needed
        e.target.value = '';
    };

    const quillModules = {
        toolbar: [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'color': [] }, { 'background': [] }],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            ['link', 'image', 'blockquote', 'code-block'],
            ['clean']
        ]
    };

    // ----------------------------------------------------------------
    // 1. Unauthenticated View
    // ----------------------------------------------------------------
    if (!token) {
        return (
            <div className={className}>
                <form onSubmit={handleLogin} className={formClassName}>
                    <h2 className={titleClassName}>Admin Access</h2>
                    <input
                        type="password"
                        placeholder="Enter admin password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={inputClassName}
                        autoFocus
                    />
                    <button type="submit" disabled={status === 'loading'} className={buttonClassName}>
                        {status === 'loading' ? 'Authenticating...' : 'Login'}
                    </button>
                    {status === 'error' && (
                        <p className={messageClassName}>Incorrect password or connection failed.</p>
                    )}
                </form>
            </div>
        );
    }

    // ----------------------------------------------------------------
    // 2. Authenticated View
    // ----------------------------------------------------------------
    return (
        <div className={className}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 className={titleClassName}>Create New Post</h2>
                <button
                    onClick={() => { setToken(''); localStorage.removeItem('adminToken'); }}
                    style={{ background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer' }}
                >
                    Logout
                </button>
            </div>

            <form onSubmit={handlePublish} className={formClassName}>
                <input
                    type="text"
                    placeholder="Post Title (e.g., My First Post)"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className={inputClassName}
                    style={{ marginBottom: '16px' }}
                />

                {/* Editor Controls: Mode Toggle & File Upload */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            type="button"
                            onClick={() => setEditorMode('visual')}
                            style={{
                                padding: '4px 12px',
                                fontWeight: editorMode === 'visual' ? 'bold' : 'normal',
                                textDecoration: editorMode === 'visual' ? 'underline' : 'none',
                                cursor: 'pointer', background: 'none', border: 'none'
                            }}
                        >
                            Visual Editor
                        </button>
                        <button
                            type="button"
                            onClick={() => setEditorMode('markdown')}
                            style={{
                                padding: '4px 12px',
                                fontWeight: editorMode === 'markdown' ? 'bold' : 'normal',
                                textDecoration: editorMode === 'markdown' ? 'underline' : 'none',
                                cursor: 'pointer', background: 'none', border: 'none'
                            }}
                        >
                            Raw Markdown
                        </button>
                    </div>

                    <div>
                        <label style={{ cursor: 'pointer', fontSize: '14px', textDecoration: 'underline' }}>
                            Upload .md File
                            <input
                                type="file"
                                accept=".md,.markdown,text/markdown"
                                onChange={handleFileUpload}
                                style={{ display: 'none' }}
                            />
                        </label>
                    </div>
                </div>

                {/* Dynamic Editor View */}
                <div style={{ marginBottom: '16px', backgroundColor: '#fff', color: '#000', borderRadius: '4px' }}>
                    {editorMode === 'visual' ? (
                        <ReactQuill
                            theme="snow"
                            value={content}
                            onChange={setContent}
                            modules={quillModules}
                            style={{ height: '350px', marginBottom: '40px' }}
                        />
                    ) : (
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Write or paste your raw markdown here..."
                            style={{
                                width: '100%',
                                height: '390px', // Roughly matches the Quill visual height + toolbar
                                padding: '12px',
                                fontFamily: 'monospace',
                                border: '1px solid #ccc',
                                borderRadius: '4px',
                                resize: 'vertical'
                            }}
                        />
                    )}
                </div>

                <button type="submit" disabled={status === 'loading'} className={buttonClassName}>
                    {status === 'loading' ? 'Publishing...' : 'Publish Post'}
                </button>

                {status === 'success' && (
                    <div className={messageClassName}>Post published successfully!</div>
                )}
                {status === 'error' && (
                    <div className={messageClassName}>Failed to publish post.</div>
                )}
            </form>
        </div>
    );
}