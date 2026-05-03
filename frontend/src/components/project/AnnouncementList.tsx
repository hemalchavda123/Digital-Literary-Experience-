import { useState } from "react"
import { useProjects } from "@/context/ProjectContext"
import type { Announcement } from "@/types/announcement"

function AnnouncementItem({
  announcement,
  projectId,
  isOwner,
  currentUserId,
}: {
  announcement: Announcement;
  projectId: string;
  isOwner: boolean;
  currentUserId?: string;
}) {
  const { deleteAnnouncement, addReplyToAnnouncement, removeReplyFromAnnouncement } = useProjects();
  const [replyContent, setReplyContent] = useState("");
  const [isReplying, setIsReplying] = useState(false);
  const [showReplies, setShowReplies] = useState(false);

  const repliesCount = announcement.replies?.length || 0;

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim()) return;
    setIsReplying(true);
    try {
      await addReplyToAnnouncement(projectId, announcement.id, replyContent);
      setReplyContent("");
    } catch (error) {
      console.error("Failed to add reply", error);
    } finally {
      setIsReplying(false);
    }
  };

  const handleDeleteReply = async (replyId: string) => {
    if (!window.confirm("Delete this reply?")) return;
    try {
      await removeReplyFromAnnouncement(projectId, announcement.id, replyId);
    } catch (error) {
      console.error("Failed to delete reply", error);
    }
  };

  return (
    <div className="border border-gray-200 rounded-md p-5 bg-white shadow-sm flex flex-col gap-3 relative group">
      {isOwner && (
        <button
          onClick={() => {
            if (window.confirm("Are you sure you want to delete this announcement?")) {
              deleteAnnouncement(projectId, announcement.id);
            }
          }}
          className="absolute top-4 right-4 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
          title="Delete"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
        </button>
      )}
      <div className="text-xs text-gray-500">
        {new Date(announcement.createdAt).toLocaleString()}
      </div>
      <p className="text-sm text-gray-900 whitespace-pre-wrap">{announcement.content}</p>

      {/* Replies Toggle */}
      <div className="mt-1 flex items-center gap-4">
        <button 
          onClick={() => setShowReplies(!showReplies)}
          className="text-xs font-medium text-gray-500 hover:text-gray-800 transition-colors flex items-center gap-1.5"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
          {repliesCount > 0 ? `${repliesCount} ${repliesCount === 1 ? 'Reply' : 'Replies'}` : 'Reply'}
        </button>
      </div>

      {/* Replies Section */}
      {showReplies && (
        <div className="mt-2 flex flex-col gap-3 pl-4 border-l-2 border-gray-100">
          {announcement.replies?.map((reply) => (
            <div key={reply.id} className="group/reply relative flex flex-col gap-1 mt-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-700">
                  {reply.user?.username || "Unknown"}
                </span>
                <span className="text-[10px] text-gray-400">
                  {new Date(reply.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-gray-800">{reply.content}</p>
              {(isOwner || reply.userId === currentUserId) && (
                <button
                  onClick={() => handleDeleteReply(reply.id)}
                  className="absolute top-0 right-0 text-gray-300 hover:text-red-500 opacity-0 group-hover/reply:opacity-100 transition-opacity bg-white pl-1"
                  title="Delete Reply"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                </button>
              )}
            </div>
          ))}
          
          {/* Reply Input */}
          <form onSubmit={handleReplySubmit} className="mt-2 flex gap-2">
            <input
              type="text"
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Write a reply..."
              className="flex-1 text-sm border-b border-gray-200 bg-transparent py-1 px-1 focus:outline-none focus:border-[#a17038] placeholder:text-gray-400 text-[#0f120f]"
              disabled={isReplying}
            />
            <button
              type="submit"
              disabled={isReplying || !replyContent.trim()}
              className="text-xs font-semibold text-[#a17038] hover:text-[#8a5f2e] disabled:opacity-50 transition-colors"
            >
              Post
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export function AnnouncementList({ projectId, isOwner, currentUserId }: { projectId: string, isOwner: boolean, currentUserId?: string }) {
  const { announcementsForProject, createAnnouncement } = useProjects()
  const announcements = announcementsForProject(projectId)
  const [newContent, setNewContent] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newContent.trim()) return
    setIsSubmitting(true)
    try {
      await createAnnouncement(projectId, newContent)
      setNewContent("")
    } catch (error) {
      console.error("Failed to create announcement", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 mt-4">
      {isOwner && (
        <form onSubmit={handleSubmit} className="bg-white border-2 border-transparent hover:border-[#a17038]/50 transition-colors duration-200 p-5 rounded-md flex flex-col gap-3 shadow-sm">
          <h3 className="text-base font-extrabold" style={{ color: "#000000" }}>New Announcement</h3>
          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Type your announcement here..."
            className="w-full min-h-[100px] p-3 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black bg-white text-[#0f120f] placeholder:text-gray-500 font-medium"
            disabled={isSubmitting}
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting || !newContent.trim()}
              className="px-5 py-2 text-sm font-semibold rounded hover:opacity-95 disabled:opacity-50 transition-opacity"
              style={{ backgroundColor: "#a17038", color: "#ffffff" }}
            >
              {isSubmitting ? "Posting..." : "Post Announcement"}
            </button>
          </div>
        </form>
      )}

      <div className="flex flex-col gap-4">
        {announcements.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">No announcements yet.</p>
        ) : (
          announcements.map((ann) => (
            <AnnouncementItem
              key={ann.id}
              announcement={ann}
              projectId={projectId}
              isOwner={isOwner}
              currentUserId={currentUserId}
            />
          ))
        )}
      </div>
    </div>
  )
}
