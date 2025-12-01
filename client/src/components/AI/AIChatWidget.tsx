import React, { useState, useRef, useEffect } from 'react';
import {
    Box,
    Paper,
    Typography,
    IconButton,
    TextField,
    Fab,
    Avatar,
    Chip,
    CircularProgress,
    Fade,
    useTheme
} from '@mui/material';
import {
    Chat as ChatIcon,
    Close as CloseIcon,
    Send as SendIcon,
    SmartToy as BotIcon,
    Person as PersonIcon,
    AutoAwesome as SparklesIcon
} from '@mui/icons-material';
import { API_BASE_URL } from '../../config/apiConfig';

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'ai';
    timestamp: Date;
}

const AIChatWidget: React.FC = () => {
    const theme = useTheme();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            text: 'Halo! Saya asisten pintar SIMKA. Ada yang bisa saya bantu?',
            sender: 'ai',
            timestamp: new Date(),
        },
    ]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    const handleSendMessage = async () => {
        if (!inputText.trim()) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            text: inputText,
            sender: 'user',
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInputText('');
        setIsLoading(true);

        try {
            const res = await fetch(`${API_BASE_URL}/ai/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: userMessage.text }),
            });

            const data = await res.json();

            const aiMessage: Message = {
                id: (Date.now() + 1).toString(),
                text: data.reply || "Maaf, terjadi kesalahan pada server.",
                sender: 'ai',
                timestamp: new Date(),
            };

            setMessages((prev) => [...prev, aiMessage]);
        } catch (error) {
            console.error('Error sending message:', error);
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                text: "Maaf, saya tidak dapat terhubung ke server saat ini.",
                sender: 'ai',
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const suggestions = [
        "Apa itu SIMKA?",
        "Bantuan Agunan",
        "Cek Debitur NPL",
    ];

    return (
        <Box sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999 }}>
            <Fade in={isOpen}>
                <Paper
                    elevation={6}
                    sx={{
                        position: 'absolute',
                        bottom: 80,
                        right: 0,
                        width: { xs: 300, md: 360 },
                        height: 500,
                        display: 'flex',
                        flexDirection: 'column',
                        borderRadius: 3,
                        overflow: 'hidden',
                        border: '1px solid',
                        borderColor: 'divider'
                    }}
                >
                    {/* Header */}
                    <Box sx={{
                        p: 2,
                        background: 'linear-gradient(to right, #059669, #0d9488)',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 32, height: 32 }}>
                                <SparklesIcon fontSize="small" />
                            </Avatar>
                            <Box>
                                <Typography variant="subtitle2" fontWeight="bold">
                                    SIMKA Assistant
                                </Typography>
                                <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, opacity: 0.9 }}>
                                    <Box component="span" sx={{ width: 8, height: 8, bgcolor: '#4ade80', borderRadius: '50%', display: 'inline-block' }} />
                                    Online
                                </Typography>
                            </Box>
                        </Box>
                        <IconButton size="small" onClick={() => setIsOpen(false)} sx={{ color: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}>
                            <CloseIcon />
                        </IconButton>
                    </Box>

                    {/* Messages */}
                    <Box sx={{ flex: 1, overflowY: 'auto', p: 2, bgcolor: '#f8fafc', display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {messages.map((msg) => (
                            <Box
                                key={msg.id}
                                sx={{
                                    display: 'flex',
                                    gap: 1,
                                    flexDirection: msg.sender === 'user' ? 'row-reverse' : 'row',
                                    alignItems: 'flex-start'
                                }}
                            >
                                <Avatar
                                    sx={{
                                        width: 32,
                                        height: 32,
                                        bgcolor: msg.sender === 'user' ? 'primary.light' : 'secondary.light'
                                    }}
                                >
                                    {msg.sender === 'user' ? <PersonIcon fontSize="small" /> : <BotIcon fontSize="small" />}
                                </Avatar>
                                <Paper
                                    elevation={0}
                                    sx={{
                                        p: 1.5,
                                        maxWidth: '80%',
                                        borderRadius: 2,
                                        bgcolor: msg.sender === 'user' ? 'primary.main' : 'white',
                                        color: msg.sender === 'user' ? 'white' : 'text.primary',
                                        border: msg.sender === 'ai' ? '1px solid' : 'none',
                                        borderColor: 'divider'
                                    }}
                                >
                                    <Typography variant="body2">{msg.text}</Typography>
                                    <Typography variant="caption" sx={{ display: 'block', mt: 0.5, opacity: 0.7, fontSize: '0.65rem', textAlign: 'right' }}>
                                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </Typography>
                                </Paper>
                            </Box>
                        ))}
                        {isLoading && (
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.light' }}>
                                    <BotIcon fontSize="small" />
                                </Avatar>
                                <Paper elevation={0} sx={{ p: 1.5, borderRadius: 2, bgcolor: 'white', border: '1px solid', borderColor: 'divider' }}>
                                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                                        <Box sx={{ width: 6, height: 6, bgcolor: 'grey.400', borderRadius: '50%', animation: 'pulse 1s infinite' }} />
                                        <Box sx={{ width: 6, height: 6, bgcolor: 'grey.400', borderRadius: '50%', animation: 'pulse 1s infinite 0.2s' }} />
                                        <Box sx={{ width: 6, height: 6, bgcolor: 'grey.400', borderRadius: '50%', animation: 'pulse 1s infinite 0.4s' }} />
                                    </Box>
                                </Paper>
                            </Box>
                        )}
                        <div ref={messagesEndRef} />
                    </Box>

                    {/* Suggestions */}
                    {messages.length === 1 && (
                        <Box sx={{ px: 2, pb: 1, bgcolor: '#f8fafc', display: 'flex', gap: 1, overflowX: 'auto', '&::-webkit-scrollbar': { display: 'none' } }}>
                            {suggestions.map((s) => (
                                <Chip
                                    key={s}
                                    label={s}
                                    onClick={() => setInputText(s)}
                                    size="small"
                                    variant="outlined"
                                    color="primary"
                                    sx={{ cursor: 'pointer', bgcolor: 'white' }}
                                />
                            ))}
                        </Box>
                    )}

                    {/* Input */}
                    <Box sx={{ p: 2, bgcolor: 'white', borderTop: '1px solid', borderColor: 'divider' }}>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <TextField
                                fullWidth
                                size="small"
                                placeholder="Tanya sesuatu..."
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                onKeyDown={handleKeyPress}
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 4 } }}
                            />
                            <IconButton
                                color="primary"
                                disabled={!inputText.trim() || isLoading}
                                onClick={handleSendMessage}
                                sx={{ bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' }, '&.Mui-disabled': { bgcolor: 'action.disabledBackground' } }}
                            >
                                <SendIcon />
                            </IconButton>
                        </Box>
                    </Box>
                </Paper>
            </Fade>

            <Fab
                color="primary"
                aria-label="chat"
                onClick={() => setIsOpen(!isOpen)}
                sx={{
                    width: 64,
                    height: 64,
                    background: 'linear-gradient(45deg, #059669 30%, #0d9488 90%)',
                    boxShadow: '0 3px 5px 2px rgba(13, 148, 136, .3)',
                }}
            >
                {isOpen ? <CloseIcon /> : <ChatIcon />}
            </Fab>
        </Box>
    );
};

export default AIChatWidget;
