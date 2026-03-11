"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface Message {
    id: string;
    content: string;
    createdAt: string;
    sender: { id: string; name: string; role: string };
}

interface ChatBoxProps {
    bookingId: string;
    currentUserId: string;
}

export default function ChatBox({ bookingId, currentUserId }: ChatBoxProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [sending, setSending] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const fetchMessages = useCallback(async () => {
        try {
            const res = await fetch(`/api/messages?bookingId=${bookingId}`);
            if (res.ok) {
                const data = await res.json();
                setMessages(data);
            }
        } catch {
            // silent fail on poll
        }
    }, [bookingId]);

    // Initial fetch + polling every 3s
    useEffect(() => {
        fetchMessages();
        const interval = setInterval(fetchMessages, 3000);
        return () => clearInterval(interval);
    }, [fetchMessages]);

    // Auto-scroll on new messages
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || sending) return;
        setSending(true);

        try {
            const res = await fetch("/api/messages", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ bookingId, content: input.trim() }),
            });

            if (res.ok) {
                setInput("");
                await fetchMessages();
            }
        } catch {
            // silent
        }

        setSending(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const formatTime = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    };

    return (
        <div style={styles.wrapper}>
            <div ref={containerRef} style={styles.messagesContainer}>
                {messages.length === 0 ? (
                    <div style={styles.emptyState}>
                        <span style={{ fontSize: "2rem" }}>💬</span>
                        <p>No messages yet. Start the conversation!</p>
                    </div>
                ) : (
                    messages.map((msg) => {
                        const isOwn = msg.sender.id === currentUserId;
                        return (
                            <div
                                key={msg.id}
                                style={{
                                    ...styles.messageBubbleWrapper,
                                    justifyContent: isOwn ? "flex-end" : "flex-start",
                                }}
                            >
                                <div
                                    style={{
                                        ...styles.messageBubble,
                                        ...(isOwn ? styles.ownBubble : styles.otherBubble),
                                    }}
                                >
                                    {!isOwn && (
                                        <div style={styles.senderName}>
                                            {msg.sender.name}
                                            <span style={styles.roleTag}>
                                                {msg.sender.role === "MECHANIC" ? "🔧" : "🚗"}
                                            </span>
                                        </div>
                                    )}
                                    <div style={styles.messageContent}>{msg.content}</div>
                                    <div style={styles.messageTime}>{formatTime(msg.createdAt)}</div>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={bottomRef} />
            </div>

            <div style={styles.inputArea}>
                <input
                    type="text"
                    className="form-input"
                    placeholder="Type a message..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    style={{ flex: 1, marginBottom: 0 }}
                />
                <button
                    className="btn btn-primary btn-sm"
                    onClick={handleSend}
                    disabled={sending || !input.trim()}
                    style={{ flexShrink: 0 }}
                >
                    {sending ? "..." : "Send"}
                </button>
            </div>
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {
    wrapper: {
        display: "flex",
        flexDirection: "column",
        height: "400px",
        borderRadius: "var(--radius)",
        overflow: "hidden",
        border: "1px solid var(--border-color)",
        background: "var(--bg-primary)",
    },
    messagesContainer: {
        flex: 1,
        overflowY: "auto",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
    },
    emptyState: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--text-muted)",
        gap: "8px",
    },
    messageBubbleWrapper: {
        display: "flex",
        width: "100%",
    },
    messageBubble: {
        maxWidth: "75%",
        padding: "10px 14px",
        borderRadius: "12px",
        fontSize: "0.9rem",
        lineHeight: "1.4",
    },
    ownBubble: {
        background: "rgba(99, 102, 241, 0.2)",
        border: "1px solid rgba(99, 102, 241, 0.3)",
        borderBottomRightRadius: "4px",
    },
    otherBubble: {
        background: "var(--bg-card)",
        border: "1px solid var(--glass-border)",
        borderBottomLeftRadius: "4px",
    },
    senderName: {
        fontSize: "0.75rem",
        fontWeight: 700,
        color: "var(--primary-light)",
        marginBottom: "4px",
        display: "flex",
        alignItems: "center",
        gap: "4px",
    },
    roleTag: {
        fontSize: "0.7rem",
    },
    messageContent: {
        wordBreak: "break-word" as const,
    },
    messageTime: {
        fontSize: "0.7rem",
        color: "var(--text-muted)",
        marginTop: "4px",
        textAlign: "right" as const,
    },
    inputArea: {
        display: "flex",
        gap: "8px",
        padding: "12px",
        borderTop: "1px solid var(--border-color)",
        background: "var(--bg-secondary)",
    },
};
