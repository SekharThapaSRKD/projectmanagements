'use client';

import { 
  Hash, 
  MessageSquare, 
  Users, 
  SendHorizontal, 
  MoreVertical, 
  Info,
  Search,
  Plus,
  Circle,
  ShieldCheck,
  Zap,
  Mic,
  Square,
  Play,
  Pause,
  Clock,
  Trash2,
  Paperclip,
  X,
  Download,
  File
} from 'lucide-react';
import { useMemo, useState, useEffect, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { useAuthStore } from '@/lib/auth-store';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export function ChatPanel() {
  const { channels, messages, members, activeWorkspaceId, activeProjectId, activeChannelId, sendMessage, setActiveChannel, hydrateMessages } = useAppStore();
  const currentUser = useAuthStore(state => state.user);
  const [messageText, setMessageText] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Voice Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [sidebarTab, setSidebarTab] = useState<'projects' | 'dms' | 'team'>('projects');

  useEffect(() => {
    if (activeChannelId) {
      void hydrateMessages(activeChannelId);
    }
  }, [activeChannelId, hydrateMessages]);

  const workspaceChannels = useMemo(() => 
    channels.filter(c => c.type === 'workspace' && c.relatedId === activeWorkspaceId), 
  [channels, activeWorkspaceId]);

  const projectChannels = useMemo(() => 
    channels.filter(c => c.type === 'project' && c.relatedId === activeProjectId), 
  [channels, activeProjectId]);

  const currentChannel = channels.find(c => c.id === activeChannelId) ?? channels[0];
  
  const threadMessages = useMemo(() => 
    messages.filter(m => m.channelId === currentChannel?.id).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()), 
  [messages, currentChannel]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [threadMessages]);

  const handleSend = () => {
    if ((!messageText.trim() && attachments.length === 0) || !currentChannel) return;
    
    // Convert files to attachment metadata
    const attachmentMetadata = attachments.map(file => ({
      id: `att_${Math.random().toString(36).slice(2)}`,
      name: file.name,
      url: URL.createObjectURL(file), // In production, upload to cloud storage
      size: file.size,
      type: file.type
    }));
    
    // For now, we'll send the message with attachments
    // In production, you'd upload files to cloud storage and get real URLs
    sendMessage(
      messageText.trim() || `📎 Shared ${attachments.length} file(s)`,
      currentChannel.id,
      undefined,
      undefined,
      undefined,
      attachmentMetadata
    );
    
    setMessageText('');
    setAttachments([]);
  };
  
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const voiceUrl = reader.result as string;
          sendMessage('Voice Message', currentChannel?.id, undefined, voiceUrl, recordingDuration);
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Failed to start recording:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
      // Don't send in this case (implementation could be refined)
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="grid h-[calc(100vh-10rem)] lg:h-[calc(100vh-14rem)] grid-cols-1 lg:grid-cols-[280px_1fr_300px] overflow-hidden rounded-[32px] border border-[hsl(var(--border-soft))] bg-[hsl(var(--bg-elevated))] shadow-2xl">
      {/* Sidebar: Navigation */}
      <aside className="hidden lg:flex flex-col border-r border-[hsl(var(--border-soft))] bg-[hsl(var(--bg-panel)/0.3)]">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-bold text-[hsl(var(--text))]">Channels</h1>
            <button className="h-8 w-8 flex items-center justify-center rounded-lg bg-[hsl(var(--bg-soft))] text-[hsl(var(--muted))] hover:text-[hsl(var(--accent))] transition-colors">
              <Plus className="h-4 w-4" />
            </button>
          </div>
          
          <div className="flex rounded-xl bg-[hsl(var(--bg-soft))] p-1 shadow-inner">
            {(['projects', 'dms', 'team'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setSidebarTab(tab)}
                className={cn(
                  "flex-1 rounded-lg py-1.5 text-[10px] font-black uppercase tracking-wider transition-all",
                  sidebarTab === tab ? "bg-[hsl(var(--bg-panel))] text-[hsl(var(--accent))] shadow-sm" : "text-[hsl(var(--muted))] hover:text-[hsl(var(--text))]"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-6">
          <AnimatePresence mode="wait">
            {sidebarTab === 'projects' && (
              <motion.div
                key="projects"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-1"
              >
                {projectChannels.length > 0 ? projectChannels.map(channel => (
                  <button
                    key={channel.id}
                    onClick={() => setActiveChannel(channel.id)}
                    className={cn(
                      "group flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 transition-all",
                      activeChannelId === channel.id 
                        ? "bg-[hsl(var(--accent)/0.1)] text-[hsl(var(--accent))] border border-[hsl(var(--accent)/0.2)] shadow-sm" 
                        : "text-[hsl(var(--muted))] hover:bg-[hsl(var(--bg-soft))] hover:text-[hsl(var(--text))]"
                    )}
                  >
                    <div className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-xl transition-colors",
                      activeChannelId === channel.id ? "bg-[hsl(var(--accent)/0.2)]" : "bg-[hsl(var(--bg-soft))]"
                    )}>
                      <Hash className="h-4.5 w-4.5" />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="truncate text-sm font-bold">{channel.name}</p>
                    </div>
                  </button>
                )) : (
                  <div className="px-4 py-12 text-center">
                    <Zap className="h-8 w-8 mx-auto mb-2 text-[hsl(var(--muted))] opacity-20" />
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[hsl(var(--muted))]">No projects active</p>
                  </div>
                )}
              </motion.div>
            )}

            {sidebarTab === 'team' && (
              <motion.div
                key="team"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-1"
              >
                {workspaceChannels.map(channel => (
                  <button
                    key={channel.id}
                    onClick={() => setActiveChannel(channel.id)}
                    className={cn(
                      "group flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 transition-all",
                      activeChannelId === channel.id 
                        ? "bg-[hsl(var(--accent)/0.1)] text-[hsl(var(--accent))] border border-[hsl(var(--accent)/0.2)] shadow-sm" 
                        : "text-[hsl(var(--muted))] hover:bg-[hsl(var(--bg-soft))] hover:text-[hsl(var(--text))]"
                    )}
                  >
                    <div className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-xl",
                      activeChannelId === channel.id ? "bg-[hsl(var(--accent)/0.2)]" : "bg-[hsl(var(--bg-soft))]"
                    )}>
                      <Users className="h-4.5 w-4.5" />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="truncate text-sm font-bold">{channel.name}</p>
                    </div>
                  </button>
                ))}
              </motion.div>
            )}

            {sidebarTab === 'dms' && (
              <motion.div
                key="dms"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-1"
              >
                {members.filter(m => m.id !== currentUser?.id).map(member => (
                  <button
                    key={member.id}
                    className="group flex w-full items-center gap-4 rounded-2xl px-3 py-3 transition-all hover:bg-[hsl(var(--bg-soft))]"
                  >
                    <div className="relative">
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[hsl(var(--bg-soft))] to-[hsl(var(--bg-panel))] flex items-center justify-center text-xs font-black shadow-inner border border-[hsl(var(--border-soft))]">
                        {member.name?.[0] || '?'}
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[hsl(var(--bg-elevated))] bg-emerald-500 shadow-sm" />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="truncate text-sm font-bold text-[hsl(var(--text))]">{member.name}</p>
                      <p className="truncate text-[10px] text-[hsl(var(--muted))] font-bold uppercase tracking-widest">Active Now</p>
                    </div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </aside>

      {/* Main Content: Chat Window */}
      <main className="flex flex-col bg-transparent relative">
        <header className="flex h-20 items-center justify-between border-b border-[hsl(var(--border-soft))] px-8 bg-[hsl(var(--bg-panel)/0.2)] backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--accent)/0.1)] text-[hsl(var(--accent))] shadow-inner">
              <Hash className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[hsl(var(--text))]">{currentChannel?.name || 'General Communication'}</h2>
              <div className="flex items-center gap-2">
                <Circle className="h-1.5 w-1.5 fill-emerald-500 text-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-[hsl(var(--muted))]">{members.length} operators online</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex h-10 w-10 items-center justify-center rounded-xl text-[hsl(var(--muted))] hover:bg-[hsl(var(--bg-soft))] hover:text-[hsl(var(--text))] transition-all" title="Channel options">
              <MoreVertical className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-8 space-y-8 scroll-smooth"
        >
          {threadMessages.length > 0 ? threadMessages.map((msg, i) => {
            const isMe = msg.senderId === currentUser?.id;
            const sender = members.find(m => m.id === msg.senderId);
            const showAvatar = i === 0 || threadMessages[i-1].senderId !== msg.senderId;

            return (
              <motion.div 
                initial={{ opacity: 0, x: isMe ? 10 : -10 }}
                animate={{ opacity: 1, x: 0 }}
                key={msg.id} 
                className={cn("flex items-start gap-4", isMe ? "flex-row-reverse" : "flex-row")}
              >
                <div className={cn(
                  "h-9 w-9 rounded-xl flex items-center justify-center text-xs font-black shadow-inner border border-[hsl(var(--border-soft))] bg-[hsl(var(--bg-soft))]",
                  !showAvatar && "opacity-0"
                )}>
                  {sender?.name?.[0] || '?'}
                </div>
                <div className={cn("flex flex-col gap-1.5 max-w-[75%]", isMe ? "items-end" : "items-start")}>
                  {showAvatar && (
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[hsl(var(--muted))]">
                      {isMe ? "Autonomous Unit (You)" : sender?.name} • {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                  {msg.voiceUrl ? (
                    <div className={cn("mt-2 flex items-center gap-3 rounded-2xl p-3 ring-1 backdrop-blur-md", isMe ? "bg-white/10 ring-white/10" : "bg-[hsl(var(--bg-panel))] ring-[hsl(var(--border-soft))]")}>
                      <button 
                        onClick={(e) => {
                          const audio = e.currentTarget.nextElementSibling as HTMLAudioElement;
                          if (audio.paused) audio.play(); else audio.pause();
                        }}
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(var(--accent))] text-black shadow-lg transition hover:scale-110 active:scale-95"
                      >
                        <Play className="h-5 w-5 fill-current" />
                      </button>
                      <audio src={msg.voiceUrl} className="hidden" onPlay={(e) => {
                        const btn = e.currentTarget.previousElementSibling as HTMLButtonElement;
                        btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pause h-5 w-5 fill-current"><rect width="4" height="16" x="6" y="4" rx="1"/><rect width="4" height="16" x="14" y="4" rx="1"/></svg>';
                      }} onPause={(e) => {
                        const btn = e.currentTarget.previousElementSibling as HTMLButtonElement;
                        btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-play h-5 w-5 fill-current"><polygon points="6 3 20 12 6 21 6 3"/></svg>';
                      }} />
                      <div className="flex-1">
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                          <div className="h-full w-1/3 bg-[hsl(var(--accent))] shadow-[0_0_8px_hsl(var(--accent)/0.5)]" />
                        </div>
                        <p className="mt-1.5 text-[10px] font-black uppercase tracking-widest text-[hsl(var(--muted))]">Voice Message • {formatDuration(msg.duration || 0)}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {msg.content && (
                        <div className={cn(
                          "rounded-[24px] px-5 py-3 text-sm leading-relaxed shadow-sm transition-all",
                          isMe 
                            ? "bg-[hsl(var(--accent))] text-black font-medium rounded-tr-none" 
                            : "bg-[hsl(var(--bg-panel))] border border-[hsl(var(--border-soft))] text-[hsl(var(--text))] rounded-tl-none"
                        )}>
                          {msg.content}
                        </div>
                      )}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="space-y-2">
                          {msg.attachments.map((att) => (
                            <a
                              key={att.id}
                              href={att.url}
                              download={att.name}
                              className={cn(
                                "flex items-center gap-3 rounded-[16px] px-4 py-3 text-sm transition-all hover:scale-105 active:scale-95",
                                isMe 
                                  ? "bg-white/10 text-white" 
                                  : "bg-[hsl(var(--bg-soft))] border border-[hsl(var(--border))] text-[hsl(var(--text))] hover:bg-[hsl(var(--bg-panel))]"
                              )}
                            >
                              <File className="h-5 w-5 flex-shrink-0 text-[hsl(var(--accent))]" />
                              <div className="flex-1 min-w-0">
                                <p className="truncate font-medium">{att.name}</p>
                                <p className="text-[10px] text-[hsl(var(--muted))]">{formatFileSize(att.size)}</p>
                              </div>
                              <Download className="h-4 w-4 flex-shrink-0 opacity-60 group-hover:opacity-100" />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          }) : (
            <div className="flex h-full flex-col items-center justify-center text-center p-8 opacity-40">
              <div className="h-24 w-24 rounded-[32px] bg-[hsl(var(--bg-soft))] flex items-center justify-center mb-6">
                <MessageSquare className="h-10 w-10 text-[hsl(var(--muted))]" />
              </div>
              <h3 className="text-xl font-bold mb-2">Beginning of communication</h3>
              <p className="text-sm max-w-xs text-[hsl(var(--muted))]">This marks the start of the #{currentChannel?.name} thread. All exchanges are logged for workspace continuity.</p>
            </div>
          )}
        </div>

        <div className="p-8 pt-0 sticky bottom-0 bg-gradient-to-t from-[hsl(var(--bg-elevated))] to-transparent">
          {/* Attachments Preview */}
          {attachments.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {attachments.map((file, idx) => (
                <div key={idx} className="flex items-center gap-2 rounded-lg bg-[hsl(var(--bg-soft))] px-3 py-2 text-xs">
                  <File className="h-4 w-4 text-[hsl(var(--accent))]" />
                  <span className="truncate max-w-[200px] text-[hsl(var(--text))]">{file.name}</span>
                  <button
                    onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))}
                    className="hover:text-[hsl(var(--accent))]"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="relative flex items-center gap-3">
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => {
                if (e.target.files) {
                  setAttachments([...attachments, ...Array.from(e.target.files)]);
                  e.target.value = '';
                }
              }}
              multiple
              className="hidden"
              accept="*/*"
            />
            
            <div className="relative flex-1">
              <input
                value={messageText}
                onChange={e => setMessageText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                disabled={isRecording}
                placeholder={isRecording ? "Recording voice..." : "Type your message..."}
                className={cn(
                  "w-full rounded-[24px] border border-[hsl(var(--border-soft))] bg-[hsl(var(--bg-soft))] px-6 py-4 text-sm text-[hsl(var(--text))] outline-none transition-all focus:border-[hsl(var(--accent)/0.5)] focus:ring-4 focus:ring-[hsl(var(--accent)/0.05)]",
                  isRecording && "border-[hsl(var(--accent))] pl-14"
                )}
              />
              {isRecording && (
                <div className="absolute left-4 top-1/2 flex -translate-y-1/2 items-center gap-2">
                  <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500 shadow-[0_0_8px_red]" />
                  <span className="text-xs font-black text-red-500">{formatDuration(recordingDuration)}</span>
                </div>
              )}
            </div>

            {isRecording ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={cancelRecording}
                  className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-[hsl(var(--muted))] transition hover:bg-white/10 hover:text-white"
                  title="Cancel recording"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
                <button
                  onClick={stopRecording}
                  className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500 text-white shadow-lg shadow-red-500/20 transition hover:scale-105 active:scale-95"
                  title="Stop recording and send"
                >
                  <Square className="h-5 w-5 fill-current" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-[hsl(var(--muted))] transition hover:bg-white/10 hover:text-[hsl(var(--accent))]"
                  title="Attach files (videos, images, documents)"
                >
                  <Paperclip className="h-5 w-5" />
                </button>
                <button
                  onClick={startRecording}
                  className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-[hsl(var(--muted))] transition hover:bg-white/10 hover:text-[hsl(var(--accent))]"
                  title="Record voice message"
                >
                  <Mic className="h-5 w-5" />
                </button>
                <button
                  onClick={handleSend}
                  disabled={!messageText.trim() && attachments.length === 0}
                  className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[hsl(var(--accent))] text-black shadow-lg shadow-[hsl(var(--accent)/0.2)] transition hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
                  title="Send message"
                >
                  <SendHorizontal className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Right Sidebar: Details */}
      <aside className="hidden lg:block border-l border-[hsl(var(--border-soft))] bg-[hsl(var(--bg-panel)/0.3)]">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-8">
             <div className="h-10 w-10 rounded-xl bg-[hsl(var(--bg-soft))] flex items-center justify-center">
                <Info className="h-5 w-5 text-[hsl(var(--muted))]" />
             </div>
             <h3 className="font-bold text-[hsl(var(--text))]">Core Intel</h3>
          </div>
          
          <div className="space-y-10">
            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-[hsl(var(--muted))]">Context Summary</p>
              <p className="text-sm text-[hsl(var(--muted))] leading-relaxed">
                Autonomous collaboration hub for #{currentChannel?.name}. All members assigned to this scope can synchronize here.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[hsl(var(--border-soft))] pb-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-[hsl(var(--muted))]">Authorized Personnel — {members.length}</p>
                <Users className="h-3.5 w-3.5 text-[hsl(var(--muted))]" />
              </div>
              <div className="space-y-3 overflow-y-auto max-h-[400px] pr-2">
                {members.map(member => (
                  <div key={member.id} className="group flex items-center gap-4 transition-all hover:translate-x-1">
                    <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[hsl(var(--bg-soft))] to-[hsl(var(--bg-panel))] flex items-center justify-center text-[10px] font-black border border-[hsl(var(--border-soft))] shadow-inner">
                      {member.name?.[0] || '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold group-hover:text-[hsl(var(--accent))] transition-colors">{member.name}</p>
                      <div className="flex items-center gap-1.5">
                         <ShieldCheck className="h-3 w-3 text-emerald-500" />
                         <span className="text-[9px] text-[hsl(var(--muted))] font-bold uppercase tracking-wider">{member.role}</span>
                      </div>
                    </div>
                    <div className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4">
              <button className="w-full group rounded-2xl border border-[hsl(var(--border-soft))] bg-[hsl(var(--bg-soft))/0.3] py-4 text-[10px] font-black uppercase tracking-widest transition-all hover:bg-[hsl(var(--accent))] hover:text-black hover:border-[hsl(var(--accent))]">
                Access Shared Assets
              </button>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}