'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Hash, Users, MessageSquare, Plus, Search, SendHorizontal, Paperclip, Mic, File, Play, Pause, MoreVertical, ArrowLeft } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { useAuthStore } from '@/lib/auth-store';
import { cn } from '@/lib/utils';

export function ChatWorkspace() {
  const { channels, messages, members, activeWorkspaceId, activeProjectId, activeChannelId, setActiveChannel, hydrateMessages, sendMessage, addChannel, addToast } = useAppStore();
  const currentUser = useAuthStore(s => s.user);
  const [sidebarTab, setSidebarTab] = useState<'channels' | 'dms' | 'members'>('channels');
  const [query, setQuery] = useState('');
  const [composerText, setComposerText] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (activeChannelId) void hydrateMessages(activeChannelId);
  }, [activeChannelId, hydrateMessages]);

  const workspaceChannels = useMemo(() => channels.filter(c => c.type === 'workspace' && c.relatedId === activeWorkspaceId), [channels, activeWorkspaceId]);
  const projectChannels = useMemo(() => channels.filter(c => c.type === 'project' && c.relatedId === activeProjectId), [channels, activeProjectId]);
  const currentChannel = channels.find(c => c.id === activeChannelId) ?? channels[0];
  const threadMessages = useMemo(() => messages.filter(m => m.channelId === currentChannel?.id).sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()), [messages, currentChannel]);
  const sidebarItems = useMemo(
    () => (sidebarTab === 'channels' ? [...projectChannels, ...workspaceChannels] : members.filter(m => m.id !== currentUser?.memberId)),
    [sidebarTab, projectChannels, workspaceChannels, members, currentUser?.memberId]
  );

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [threadMessages]);

  const handleFile = (files: FileList | null) => {
    if (!files) return;
    setAttachments(prev => [...prev, ...Array.from(files)]);
  };

  const handleCreateChannel = () => {
    if (!newChannelName.trim()) {
      addToast({ type: 'error', title: 'Channel Name Required', description: 'Please enter a channel name.' });
      return;
    }
    if (!activeProjectId) {
      addToast({ type: 'error', title: 'No Project Selected', description: 'Please select a project first.' });
      return;
    }
    try {
      addChannel(newChannelName.trim(), activeProjectId);
      addToast({ type: 'success', title: 'Channel Created', description: `#${newChannelName.trim().toLowerCase()} has been created.` });
      setNewChannelName('');
      setShowCreateChannel(false);
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to Create Channel', description: err instanceof Error ? err.message : 'Unknown error' });
    }
  };

  const handleSend = () => {
    if (!composerText.trim() && attachments.length === 0) return;
    const attachMeta = attachments.map(file => ({ id: `att_${Math.random().toString(36).slice(2)}`, name: file.name, url: URL.createObjectURL(file), size: file.size, type: file.type }));
    sendMessage(composerText.trim() || `📎 Shared ${attachments.length} file(s)`, currentChannel?.id, currentUser?.memberId, undefined, undefined, attachMeta);
    setComposerText('');
    setAttachments([]);
  };

  return (
    <div className="grid h-[calc(100dvh-8rem)] md:h-[calc(100dvh-10rem)] lg:h-[calc(100vh-14rem)] grid-cols-1 lg:grid-cols-[300px_1fr_320px] overflow-hidden rounded-[20px] border border-[hsl(var(--border-soft))] bg-[hsl(var(--bg-elevated))] shadow-2xl md:rounded-[32px]">
      {/* Left */}
      <aside className="hidden lg:flex flex-col border-r border-[hsl(var(--border-soft))] bg-[hsl(var(--bg-panel)/0.3)]">
        <div className="p-6 flex items-center justify-between">
          <h3 className="font-bold">Channels</h3>
          <button onClick={() => setShowCreateChannel(true)} className="h-8 w-8 rounded-lg bg-[hsl(var(--bg-soft))] flex items-center justify-center hover:bg-[hsl(var(--accent)/0.2)]"><Plus className="h-4 w-4" /></button>
        </div>
        <div className="px-4">
          <div className="flex gap-2 mb-4">
            <button onClick={() => setSidebarTab('channels')} className={cn('flex-1 py-2 rounded-lg', sidebarTab === 'channels' ? 'bg-[hsl(var(--bg-soft))] text-[hsl(var(--accent))]' : 'text-[hsl(var(--muted))]')}>Channels</button>
            <button onClick={() => setSidebarTab('dms')} className={cn('flex-1 py-2 rounded-lg', sidebarTab === 'dms' ? 'bg-[hsl(var(--bg-soft))] text-[hsl(var(--accent))]' : 'text-[hsl(var(--muted))]')}>DMs</button>
          </div>
          <div className="space-y-2 overflow-y-auto pr-2">
            {sidebarItems.map(ch => (
              <button key={(ch as any).id || ch.id} onClick={() => { setActiveChannel((ch as any).id); }} className={cn('w-full text-left px-3 py-2 rounded-2xl flex items-center gap-3', activeChannelId === (ch as any).id ? 'bg-[hsl(var(--accent)/0.1)] text-[hsl(var(--accent))]' : 'text-[hsl(var(--muted))] hover:bg-[hsl(var(--bg-soft))]')}>
                <div className="h-9 w-9 rounded-xl bg-[hsl(var(--bg-soft))] flex items-center justify-center font-bold">{(ch as any).name?.[0] || (ch as any).avatar?.[0] || '?'}</div>
                <div className="flex-1 min-w-0">
                  <p className="truncate font-bold">{(ch as any).name}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* Middle */}
      <main className="flex flex-col">
        <header className="flex items-center justify-between px-4 py-4 border-b border-[hsl(var(--border-soft))] sm:px-6">
          <div className="flex items-center gap-4">
            <button onClick={() => setMobileOpen(true)} className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--bg-soft))] lg:hidden">
              <Hash className="h-5 w-5" />
            </button>
            <div className="h-10 w-10 rounded-xl bg-[hsl(var(--bg-soft))] flex items-center justify-center text-[hsl(var(--accent))]"><Hash className="h-5 w-5" /></div>
            <div>
              <h2 className="font-bold">{currentChannel?.name || 'Select a channel'}</h2>
              <p className="text-[12px] text-[hsl(var(--muted))]">{members.length} members</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 bg-[hsl(var(--bg-soft))] rounded-lg px-2 py-1 sm:flex">
              <Search className="h-4 w-4 text-[hsl(var(--muted))]" />
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search messages" className="bg-transparent outline-none text-sm text-[hsl(var(--text))]" />
            </div>
            <button className="h-10 w-10 rounded-lg bg-[hsl(var(--bg-soft))] flex items-center justify-center"><MoreVertical className="h-4" /></button>
          </div>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6 sm:p-6">
          {threadMessages.length === 0 ? (
            <div className="text-center text-[hsl(var(--muted))]">No messages yet — start the conversation</div>
          ) : (
            threadMessages.map(msg => {
              const sender = members.find(m => m.id === msg.senderId);
              const isMe = msg.senderId === currentUser?.memberId;
              return (
                <div key={msg.id} className={cn('flex gap-4 items-start', isMe ? 'flex-row-reverse' : 'flex-row')}>
                  <div className="h-10 w-10 rounded-xl bg-[hsl(var(--bg-soft))] flex items-center justify-center font-bold">{sender?.name?.[0] || '?'}</div>
                  <div className={cn('max-w-[85%] sm:max-w-[75%]')}> 
                    <div className="text-[10px] font-black text-[hsl(var(--muted))]">{sender?.name} • {new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</div>
                    <div className={cn('rounded-2xl px-4 py-3 mt-1', isMe ? 'bg-[hsl(var(--accent))] text-black' : 'bg-[hsl(var(--bg-panel))]')}>{msg.content}</div>
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {msg.attachments.map(att => (
                          <a key={att.id} href={att.url} className="flex items-center gap-3 rounded-lg p-3 bg-[hsl(var(--bg-soft))]">
                            <File className="h-5 w-5 text-[hsl(var(--accent))]" />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{att.name}</div>
                              <div className="text-[12px] text-[hsl(var(--muted))]">{Math.round((att.size||0)/1024)} KB</div>
                            </div>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="p-4 border-t border-[hsl(var(--border-soft))] sm:p-6">
          {attachments.length > 0 && (
            <div className="mb-4 flex gap-2">
              {attachments.map((f, i) => (
                <div key={i} className="bg-[hsl(var(--bg-soft))] px-3 py-2 rounded-lg flex items-center gap-2">
                  <File className="h-4 w-4 text-[hsl(var(--accent))]" />
                  <div className="truncate max-w-[120px] sm:max-w-[200px]">{f.name}</div>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3">
            <input id="file" type="file" className="hidden" multiple onChange={e => handleFile(e.target.files)} />
            <button onClick={() => document.getElementById('file')?.click()} className="h-12 w-12 rounded-2xl bg-[hsl(var(--bg-soft))] flex items-center justify-center"><Paperclip className="h-5 w-5" /></button>
            <div className="flex-1 relative">
              <input value={composerText} onChange={e => setComposerText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} placeholder="Message #channel" className="w-full rounded-2xl border border-[hsl(var(--border-soft))] bg-[hsl(var(--bg-soft))] px-6 py-4" />
            </div>
            <button onClick={() => setMobileOpen(s => !s)} className="h-12 w-12 rounded-2xl bg-[hsl(var(--bg-soft))] flex items-center justify-center"><Mic className="h-5 w-5" /></button>
            <button onClick={handleSend} className="h-12 w-12 rounded-2xl bg-[hsl(var(--accent))] text-black flex items-center justify-center"><SendHorizontal className="h-5 w-5" /></button>
          </div>
        </div>
      </main>

      {/* Right */}
      <aside className="hidden lg:block border-l border-[hsl(var(--border-soft))] bg-[hsl(var(--bg-panel)/0.3)]">
        <div className="p-6">
          <h3 className="font-bold">Channel Details</h3>
          <p className="text-[12px] text-[hsl(var(--muted))] mt-2">{currentChannel?.description || 'No description provided.'}</p>

          <div className="mt-6">
            <h4 className="text-[10px] font-black uppercase tracking-wider text-[hsl(var(--muted))]">Members</h4>
            <div className="mt-2 space-y-2">
              {members.map(m => (
                <div key={m.id} className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-[hsl(var(--bg-soft))] flex items-center justify-center font-bold">{m.name?.[0] ?? m.avatar?.[0] ?? '?'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold">{m.name ?? m.email ?? 'Unknown'}</div>
                    <div className="text-[12px] text-[hsl(var(--muted))]">{m.role}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* Create Channel Modal */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)}>
          <aside className="h-full w-[min(86vw,340px)] border-r border-[hsl(var(--border-soft))] bg-[hsl(var(--bg-elevated))] p-4" onClick={event => event.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-bold">Channels</h3>
              <button onClick={() => setMobileOpen(false)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[hsl(var(--bg-soft))]">
                <ArrowLeft className="h-4 w-4" />
              </button>
            </div>
            <div className="mb-3 flex gap-2">
              <button onClick={() => setSidebarTab('channels')} className={cn('flex-1 py-2 rounded-lg text-sm', sidebarTab === 'channels' ? 'bg-[hsl(var(--bg-soft))] text-[hsl(var(--accent))]' : 'text-[hsl(var(--muted))]')}>Channels</button>
              <button onClick={() => setSidebarTab('dms')} className={cn('flex-1 py-2 rounded-lg text-sm', sidebarTab === 'dms' ? 'bg-[hsl(var(--bg-soft))] text-[hsl(var(--accent))]' : 'text-[hsl(var(--muted))]')}>DMs</button>
            </div>
            <div className="space-y-2 overflow-y-auto">
              {sidebarItems.map(ch => (
                <button
                  key={(ch as any).id || ch.id}
                  onClick={() => {
                    setActiveChannel((ch as any).id);
                    setMobileOpen(false);
                  }}
                  className={cn('w-full text-left px-3 py-2 rounded-2xl flex items-center gap-3', activeChannelId === (ch as any).id ? 'bg-[hsl(var(--accent)/0.1)] text-[hsl(var(--accent))]' : 'text-[hsl(var(--muted))] hover:bg-[hsl(var(--bg-soft))]')}
                >
                  <div className="h-9 w-9 rounded-xl bg-[hsl(var(--bg-soft))] flex items-center justify-center font-bold">{(ch as any).name?.[0] || (ch as any).avatar?.[0] || '?'}</div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-bold">{(ch as any).name}</p>
                  </div>
                </button>
              ))}
            </div>
          </aside>
        </div>
      )}

      {showCreateChannel && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-md rounded-2xl border border-[hsl(var(--border-soft))] bg-[hsl(var(--bg-elevated))] p-6 shadow-xl">
            <h2 className="text-lg font-bold mb-4">Create New Channel</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-[hsl(var(--muted))]">Channel Name</label>
                <input
                  type="text"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateChannel()}
                  placeholder="e.g. announcements, support, random"
                  className="mt-2 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-soft))] px-4 py-2 text-[hsl(var(--text))] outline-none focus:border-[hsl(var(--accent))] focus:ring-1 focus:ring-[hsl(var(--accent)/0.3)]"
                  autoFocus
                />
              </div>
              <div className="flex gap-2 pt-4">
                <button
                  onClick={() => {
                    setShowCreateChannel(false);
                    setNewChannelName('');
                  }}
                  className="flex-1 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-soft))] px-4 py-2 font-medium text-[hsl(var(--text))] transition hover:bg-[hsl(var(--bg-panel))]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateChannel}
                  className="flex-1 rounded-xl bg-[hsl(var(--accent))] px-4 py-2 font-medium text-black transition hover:opacity-90"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
