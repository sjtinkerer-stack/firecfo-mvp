'use client';

import { useState, useEffect } from 'react';
import { Search, Plus, MoreVertical, ChevronDown, ChevronRight, Pencil, Trash2 } from 'lucide-react';
import { Conversation, GroupedConversations } from './types';
import { formatDistanceToNow, isToday, isYesterday, isThisWeek, isThisMonth } from 'date-fns';
import { RenameConversationDialog } from './rename-conversation-dialog';
import { DeleteConversationDialog } from './delete-conversation-dialog';

interface ConversationHistoryProps {
  onSelectConversation: (conversationId: string) => void;
  onNewChat: () => void;
  onClose: () => void;
  activeConversationId: string | null;
  onUpdateActiveTitle?: (newTitle: string) => void;
}

export function ConversationHistory({
  onSelectConversation,
  onNewChat,
  onClose,
  activeConversationId,
  onUpdateActiveTitle,
}: ConversationHistoryProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState({
    today: true,
    yesterday: true,
    thisWeek: false,
    thisMonth: false,
    older: false,
  });

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/conversations');
      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const groupConversations = (): GroupedConversations => {
    const filtered = conversations.filter((conv) =>
      conv.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return {
      today: filtered.filter((c) => isToday(new Date(c.last_message_at || c.created_at))),
      yesterday: filtered.filter((c) => isYesterday(new Date(c.last_message_at || c.created_at))),
      thisWeek: filtered.filter(
        (c) =>
          isThisWeek(new Date(c.last_message_at || c.created_at), { weekStartsOn: 1 }) &&
          !isToday(new Date(c.last_message_at || c.created_at)) &&
          !isYesterday(new Date(c.last_message_at || c.created_at))
      ),
      thisMonth: filtered.filter(
        (c) =>
          isThisMonth(new Date(c.last_message_at || c.created_at)) &&
          !isThisWeek(new Date(c.last_message_at || c.created_at), { weekStartsOn: 1 })
      ),
      older: filtered.filter((c) => !isThisMonth(new Date(c.last_message_at || c.created_at))),
    };
  };

  const grouped = groupConversations();

  const toggleGroup = (group: keyof typeof expandedGroups) => {
    setExpandedGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  const renderConversationGroup = (
    title: string,
    conversations: Conversation[],
    groupKey: keyof typeof expandedGroups
  ) => {
    if (conversations.length === 0) return null;

    const isExpanded = expandedGroups[groupKey];

    return (
      <div className="mb-4">
        <button
          onClick={() => toggleGroup(groupKey)}
          className="flex items-center w-full px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg"
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 mr-2" />
          ) : (
            <ChevronRight className="w-4 h-4 mr-2" />
          )}
          {title}
          <span className="ml-auto text-gray-500 dark:text-gray-400">{conversations.length}</span>
        </button>

        {isExpanded && (
          <div className="mt-1 space-y-1">
            {conversations.map((conv) => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                isActive={conv.id === activeConversationId}
                onSelect={() => onSelectConversation(conv.id)}
                onRefresh={fetchConversations}
                onUpdateTitle={(newTitle) => {
                  // Optimistic update - update conversation in local state
                  setConversations(prev =>
                    prev.map(c => c.id === conv.id ? { ...c, title: newTitle } : c)
                  );
                  // If this is the active conversation, update chat-panel title too
                  if (conv.id === activeConversationId && onUpdateActiveTitle) {
                    onUpdateActiveTitle(newTitle);
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Conversations</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={onNewChat}
            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4 mr-1" />
            New Chat
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto p-4">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
              💬
            </div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              No conversations yet
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Start your first FIRE planning conversation
            </p>
            <button
              onClick={onNewChat}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
            >
              Start Chatting
            </button>
          </div>
        ) : searchQuery && Object.values(grouped).every((arr) => arr.length === 0) ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
              🔍
            </div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              No conversations found
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Try different keywords</p>
            <button
              onClick={() => setSearchQuery('')}
              className="text-sm text-emerald-600 hover:text-emerald-700 dark:text-emerald-500 dark:hover:text-emerald-400 font-medium"
            >
              Clear Search
            </button>
          </div>
        ) : (
          <>
            {renderConversationGroup('Today', grouped.today, 'today')}
            {renderConversationGroup('Yesterday', grouped.yesterday, 'yesterday')}
            {renderConversationGroup('This Week', grouped.thisWeek, 'thisWeek')}
            {renderConversationGroup('This Month', grouped.thisMonth, 'thisMonth')}
            {renderConversationGroup('Older', grouped.older, 'older')}
          </>
        )}
      </div>
    </div>
  );
}

// Individual conversation item component
function ConversationItem({
  conversation,
  isActive,
  onSelect,
  onRefresh,
  onUpdateTitle,
}: {
  conversation: Conversation;
  isActive: boolean;
  onSelect: () => void;
  onRefresh: () => void;
  onUpdateTitle: (newTitle: string) => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const timeAgo = formatDistanceToNow(new Date(conversation.last_message_at || conversation.created_at), {
    addSuffix: true,
  });

  return (
    <>
      <div
        className={`relative group px-4 py-3 rounded-lg cursor-pointer transition-colors ${
          isActive
            ? 'bg-emerald-50 dark:bg-emerald-900/20 border-l-2 border-emerald-600'
            : 'hover:bg-gray-50 dark:hover:bg-gray-800'
        }`}
        onClick={onSelect}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              💬 {conversation.title}
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {conversation.message_count} {conversation.message_count === 1 ? 'message' : 'messages'} • {timeAgo}
            </p>
          </div>
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMenu && (
              <>
                {/* Backdrop to close menu */}
                <div
                  className="fixed inset-0 z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                  }}
                />

                {/* Dropdown menu */}
                <div className="absolute right-0 mt-1 w-32 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                      setShowRenameDialog(true);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-t-lg flex items-center gap-2"
                  >
                    <Pencil className="w-4 h-4" />
                    Rename
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                      setShowDeleteDialog(true);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-b-lg flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Rename Dialog - Outside clickable div */}
      <RenameConversationDialog
        open={showRenameDialog}
        onOpenChange={setShowRenameDialog}
        conversationId={conversation.id}
        currentTitle={conversation.title}
        onSuccess={onUpdateTitle}
      />

      {/* Delete Dialog - Outside clickable div */}
      <DeleteConversationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        conversationId={conversation.id}
        conversationTitle={conversation.title}
        isActive={isActive}
        onSuccess={onRefresh}
      />
    </>
  );
}
