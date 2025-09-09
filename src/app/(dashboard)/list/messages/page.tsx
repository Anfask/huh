export const dynamic = "force-dynamic";
// // IMPORTS
// import FormContainer from "@/components/FormContainer";
// import Pagination from "@/components/Pagination";
// import Table from "@/components/Table";
// import TableSearch from "@/components/TableSearch";
// import prisma from "@/lib/prisma";
// import { ITEM_PER_PAGE } from "@/lib/settings";
// import { Message, Prisma, User, Class, MessageGroup, MessageAttachment } from "@prisma/client";
// import Image from "next/image";
// import Link from "next/link";
// import { auth } from "@clerk/nextjs/server";
// import ChatInterface from "@/components/ChatInterface";

// // TYPES
// type MessageList = Message & {
//   sender: User;
//   recipient?: User;
//   group?: MessageGroup;
//   attachments: MessageAttachment[];
// };

// type GroupList = MessageGroup & {
//   class: Class;
//   members: User[];
//   messages: (Message & { sender: User })[];
// };

// const MessagesPage = async ({
//   searchParams,
// }: {
//   searchParams: Promise<{ [key: string]: string | undefined }>;
// }) => {
//   const resolvedSearchParams = await searchParams;

//   const { sessionClaims, userId } = await auth();
//   const role = (sessionClaims?.publicMetadata as { role?: string })?.role;

//   const { page, view = "messages", ...queryParams } = resolvedSearchParams;
//   const p = page ? parseInt(page) : 1;

//   if (!userId) {
//     return (
//       <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
//         <div className="text-center py-8">
//           <h2 className="text-lg font-semibold text-gray-600 mb-2">Access Denied</h2>
//           <p className="text-gray-500">Please log in to access messages.</p>
//         </div>
//       </div>
//     );
//   }

//   // Get current user
//   const currentUser = await prisma.user.findUnique({
//     where: { id: userId },
//     include: {
//       sentMessages: {
//         include: {
//           recipient: true,
//           group: { include: { class: true } },
//           attachments: true
//         },
//         orderBy: { createdAt: "desc" }
//       },
//       receivedMessages: {
//         include: {
//           sender: true,
//           group: { include: { class: true } },
//           attachments: true
//         },
//         orderBy: { createdAt: "desc" }
//       },
//       groupMemberships: {
//         include: {
//           group: {
//             include: {
//               class: true,
//               members: true,
//               messages: {
//                 include: { sender: true, attachments: true },
//                 orderBy: { createdAt: "desc" },
//                 take: 1
//               }
//             }
//           }
//         }
//       }
//     }
//   });

//   if (!currentUser) {
//     return (
//       <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
//         <div className="text-center py-8">
//           <h2 className="text-lg font-semibold text-gray-600 mb-2">User Not Found</h2>
//           <p className="text-gray-500">Unable to load user data.</p>
//         </div>
//       </div>
//     );
//   }

//   // Build query based on role and view
//   const query: Prisma.MessageWhereInput = {};
//   let groupQuery: Prisma.MessageGroupWhereInput = {};

//   // Role-based access control
//   if (role === "student") {
//     query.OR = [
//       { senderId: userId },
//       { recipientId: userId },
//       { 
//         group: {
//           members: {
//             some: { id: userId }
//           }
//         }
//       }
//     ];
    
//     groupQuery.members = {
//       some: { id: userId }
//     };
//   } else if (role === "teacher") {
//     query.OR = [
//       { senderId: userId },
//       { recipientId: userId },
//       { 
//         group: {
//           OR: [
//             { createdById: userId },
//             {
//               members: {
//                 some: { id: userId }
//               }
//             }
//           ]
//         }
//       }
//     ];
    
//     groupQuery.OR = [
//       { createdById: userId },
//       {
//         members: {
//           some: { id: userId }
//         }
//       }
//     ];
//   } else if (role === "parent") {
//     // Parents can only message teachers/admins and see messages in their children's class groups
//     const parent = await prisma.parent.findUnique({
//       where: { id: userId },
//       include: {
//         students: {
//           include: {
//             class: true
//           }
//         }
//       }
//     });
    
//     const childrenClassIds = parent?.students.map(s => s.classId).filter(Boolean) || [];
    
//     query.OR = [
//       { senderId: userId },
//       { recipientId: userId },
//       {
//         group: {
//           classId: {
//             in: childrenClassIds
//           }
//         }
//       }
//     ];
    
//     groupQuery.classId = {
//       in: childrenClassIds
//     };
//   }

//   // Apply search filters
//   if (queryParams.search) {
//     query.AND = [
//       query.AND || {},
//       {
//         OR: [
//           { content: { contains: queryParams.search, mode: "insensitive" } },
//           { sender: { name: { contains: queryParams.search, mode: "insensitive" } } },
//           { recipient: { name: { contains: queryParams.search, mode: "insensitive" } } },
//           { group: { name: { contains: queryParams.search, mode: "insensitive" } } }
//         ]
//       }
//     ];
//   }

//   if (queryParams.type) {
//     if (queryParams.type === "direct") {
//       query.recipientId = { not: null };
//       query.groupId = null;
//     } else if (queryParams.type === "group") {
//       query.groupId = { not: null };
//       query.recipientId = null;
//     }
//   }

//   if (queryParams.status === "unread") {
//     query.isRead = false;
//     query.recipientId = userId;
//   }

//   // Fetch data based on view
//   if (view === "groups") {
//     const [groups, groupCount] = await prisma.$transaction([
//       prisma.messageGroup.findMany({
//         where: groupQuery,
//         include: {
//           class: true,
//           members: true,
//           messages: {
//             include: { sender: true, attachments: true },
//             orderBy: { createdAt: "desc" },
//             take: 1
//           },
//           _count: {
//             select: {
//               messages: {
//                 where: {
//                   isRead: false,
//                   senderId: { not: userId }
//                 }
//               }
//             }
//           }
//         },
//         orderBy: { updatedAt: "desc" },
//         take: ITEM_PER_PAGE,
//         skip: ITEM_PER_PAGE * (p - 1),
//       }),
//       prisma.messageGroup.count({ where: groupQuery })
//     ]);

//     return (
//       <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
//         <GroupsView 
//           groups={groups} 
//           count={groupCount} 
//           page={p} 
//           role={role}
//           userId={userId}
//           queryParams={queryParams}
//         />
//       </div>
//     );
//   }

//   // Default messages view
//   const [messages, messageCount] = await prisma.$transaction([
//     prisma.message.findMany({
//       where: query,
//       include: {
//         sender: true,
//         recipient: true,
//         group: { include: { class: true } },
//         attachments: true
//       },
//       orderBy: { createdAt: "desc" },
//       take: ITEM_PER_PAGE,
//       skip: ITEM_PER_PAGE * (p - 1),
//     }),
//     prisma.message.count({ where: query })
//   ]);

//   // Get available users for messaging (based on role)
//   let availableUsers: User[] = [];
//   if (role === "admin") {
//     availableUsers = await prisma.user.findMany({
//       where: { id: { not: userId } },
//       orderBy: { name: "asc" }
//     });
//   } else if (role === "teacher") {
//     availableUsers = await prisma.user.findMany({
//       where: {
//         AND: [
//           { id: { not: userId } },
//           {
//             OR: [
//               { role: "admin" },
//               { role: "teacher" },
//               { role: "student" },
//               { role: "parent" }
//             ]
//           }
//         ]
//       },
//       orderBy: { name: "asc" }
//     });
//   } else if (role === "student" || role === "parent") {
//     availableUsers = await prisma.user.findMany({
//       where: {
//         AND: [
//           { id: { not: userId } },
//           {
//             OR: [
//               { role: "admin" },
//               { role: "teacher" }
//             ]
//           }
//         ]
//       },
//       orderBy: { name: "asc" }
//     });
//   }

//   // Get available classes for group creation (admin/teacher only)
//   const availableClasses = (role === "admin" || role === "teacher") ? 
//     await prisma.class.findMany({
//       orderBy: { name: "asc" },
//       include: {
//         students: true,
//         supervisor: true
//       }
//     }) : [];

//   const columns = [
//     { header: "From/To", accessor: "sender", className: "w-1/4" },
//     { header: "Content", accessor: "content", className: "w-1/2" },
//     { header: "Type", accessor: "type", className: "hidden md:table-cell w-1/8" },
//     { header: "Time", accessor: "time", className: "hidden lg:table-cell w-1/8" },
//     { header: "Status", accessor: "status", className: "w-1/8" },
//     { header: "Actions", accessor: "action" },
//   ];

//   const renderRow = (item: MessageList) => {
//     const isReceived = item.recipientId === userId;
//     const otherUser = isReceived ? item.sender : item.recipient;
//     const isUnread = !item.isRead && isReceived;
    
//     return (
//       <tr
//         key={item.id}
//         className={`border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-PurpleLight ${
//           isUnread ? "bg-blue-50 font-medium" : ""
//         }`}
//       >
//         <td className="flex items-center gap-4 p-4">
//           <div className="flex flex-col">
//             <div className="flex items-center gap-2">
//               {isUnread && <div className="w-2 h-2 bg-blue-500 rounded-full"></div>}
//               <h3 className={`${isUnread ? "font-semibold" : "font-medium"}`}>
//                 {item.group ? (
//                   <span className="flex items-center gap-1">
//                     <Image src="/class.png" alt="Group" width={16} height={16} />
//                     {item.group.name}
//                   </span>
//                 ) : (
//                   <>
//                     {isReceived ? "From" : "To"}: {otherUser?.name || "Unknown"}
//                   </>
//                 )}
//               </h3>
//             </div>
//             <p className="text-xs text-gray-500">
//               {item.group ? `Class: ${item.group.class?.name}` : otherUser?.email}
//             </p>
//           </div>
//         </td>
//         <td className="p-4">
//           <div className="flex flex-col">
//             {item.messageType === "text" && (
//               <span className={`${isUnread ? "font-medium" : ""} line-clamp-2`}>
//                 {item.content}
//               </span>
//             )}
//             {item.messageType === "voice" && (
//               <div className="flex items-center gap-2 text-blue-600">
//                 <Image src="/voice.png" alt="Voice" width={16} height={16} />
//                 <span>Voice Message</span>
//               </div>
//             )}
//             {item.messageType === "file" && (
//               <div className="flex items-center gap-2 text-green-600">
//                 <Image src="/attachment.png" alt="File" width={16} height={16} />
//                 <span>File Attachment</span>
//                 {item.attachments.length > 0 && (
//                   <span className="text-xs">({item.attachments.length})</span>
//                 )}
//               </div>
//             )}
//             {item.attachments.length > 0 && (
//               <div className="text-xs text-gray-500 mt-1">
//                 {item.attachments.map(att => att.fileName).join(", ")}
//               </div>
//             )}
//           </div>
//         </td>
//         <td className="hidden md:table-cell p-4">
//           <span className={`px-2 py-1 rounded-full text-xs font-medium ${
//             item.group ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"
//           }`}>
//             {item.group ? "Group" : "Direct"}
//           </span>
//         </td>
//         <td className="hidden lg:table-cell p-4">
//           <div className="flex flex-col">
//             <span className="text-sm">
//               {new Date(item.createdAt).toLocaleDateString("en-US", {
//                 month: "short",
//                 day: "numeric",
//               })}
//             </span>
//             <span className="text-xs text-gray-500">
//               {new Date(item.createdAt).toLocaleTimeString("en-US", {
//                 hour: "2-digit",
//                 minute: "2-digit",
//               })}
//             </span>
//           </div>
//         </td>
//         <td className="p-4">
//           <div className="flex flex-col items-center">
//             {isReceived ? (
//               <span className={`px-2 py-1 rounded-full text-xs font-medium ${
//                 item.isRead 
//                   ? "bg-gray-100 text-gray-800" 
//                   : "bg-green-100 text-green-800"
//               }`}>
//                 {item.isRead ? "Read" : "New"}
//               </span>
//             ) : (
//               <span className={`px-2 py-1 rounded-full text-xs font-medium ${
//                 item.isRead 
//                   ? "bg-blue-100 text-blue-800" 
//                   : "bg-yellow-100 text-yellow-800"
//               }`}>
//                 {item.isRead ? "Delivered" : "Sent"}
//               </span>
//             )}
//           </div>
//         </td>
//         <td className="p-4">
//           <div className="flex items-center gap-2">
//             <Link
//               href={`/messages/chat?${item.group ? `group=${item.group.id}` : `user=${otherUser?.id}`}`}
//               className="w-7 h-7 flex items-center justify-center rounded-full bg-Sky hover:bg-blue-400 transition-colors"
//             >
//               <Image src="/view.png" alt="Open Chat" width={14} height={14} />
//             </Link>
//             {(role === "admin" || item.senderId === userId) && (
//               <FormContainer table="message" type="delete" id={item.id} />
//             )}
//           </div>
//         </td>
//       </tr>
//     );
//   };

//   // Calculate statistics
//   const unreadCount = messages.filter(m => !m.isRead && m.recipientId === userId).length;
//   const directMessages = messages.filter(m => !m.group).length;
//   const groupMessages = messages.filter(m => m.group).length;
//   const sentMessages = messages.filter(m => m.senderId === userId).length;
//   const receivedMessages = messages.filter(m => m.recipientId === userId).length;

//   const messageStats = {
//     total: messageCount,
//     unread: unreadCount,
//     direct: directMessages,
//     group: groupMessages,
//     sent: sentMessages,
//     received: receivedMessages,
//   };

//   const getQueryString = (params: Record<string, string | undefined>) => {
//     const query = new URLSearchParams();
//     for (const [key, value] of Object.entries(params)) {
//       if (value) query.set(key, value);
//     }
//     return query.toString();
//   };

//   const filterOptions = [
//     { value: "", label: "All Messages" },
//     { value: "direct", label: "Direct Messages" },
//     { value: "group", label: "Group Messages" },
//   ];

//   const statusOptions = [
//     { value: "", label: "All Status" },
//     { value: "unread", label: "Unread Only" },
//   ];

//   return (
//     <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
//       {/* TOP */}
//       <div className="flex items-center justify-between mb-4">
//         <div className="flex flex-col">
//           <h1 className="hidden md:block text-lg font-semibold">Messages</h1>
//           <p className="text-sm text-gray-500">
//             Manage your conversations and group chats
//           </p>
//         </div>
//         <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
//           {/* VIEW TOGGLE */}
//           <div className="flex rounded-lg bg-gray-100 p-1">
//             <Link
//               href={`/list/messages?${getQueryString({ ...queryParams, view: "messages" })}`}
//               className={`px-3 py-1 text-sm rounded-md transition-colors ${
//                 view === "messages" 
//                   ? "bg-white text-blue-600 shadow-sm" 
//                   : "text-gray-600 hover:text-gray-800"
//               }`}
//             >
//               Messages
//             </Link>
//             <Link
//               href={`/list/messages?${getQueryString({ ...queryParams, view: "groups" })}`}
//               className={`px-3 py-1 text-sm rounded-md transition-colors ${
//                 view === "groups" 
//                   ? "bg-white text-blue-600 shadow-sm" 
//                   : "text-gray-600 hover:text-gray-800"
//               }`}
//             >
//               Groups
//             </Link>
//           </div>

//           <TableSearch />
//           <div className="flex items-center gap-4 self-end">
//             {/* FILTER DROPDOWN */}
//             <div className="relative group">
//               <button className="w-8 h-8 flex items-center justify-center rounded-full bg-Yellow hover:bg-yellow-400 transition-colors">
//                 <Image src="/filter.png" alt="Filter" width={14} height={14} />
//               </button>
//               <div className="absolute right-0 top-10 bg-white border border-gray-200 rounded-md shadow-lg z-10 min-w-[200px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
//                 <div className="py-2 px-3">
//                   <div className="mb-3">
//                     <label className="block text-xs font-medium text-gray-700 mb-2">
//                       Message Type
//                     </label>
//                     <div className="flex flex-col gap-1">
//                       {filterOptions.map((option) => (
//                         <Link
//                           key={option.value}
//                           href={`/list/messages?${getQueryString({
//                             ...queryParams,
//                             type: option.value || undefined,
//                           })}`}
//                           className={`px-3 py-2 text-xs rounded font-medium ${
//                             queryParams.type === option.value
//                               ? "bg-blue-500 text-white"
//                               : "bg-gray-100 hover:bg-blue-50 text-gray-700"
//                           }`}
//                         >
//                           {option.label}
//                         </Link>
//                       ))}
//                     </div>
//                   </div>

//                   <div className="mb-2 border-t pt-2">
//                     <label className="block text-xs font-medium text-gray-700 mb-2">
//                       Status Filter
//                     </label>
//                     <div className="flex flex-col gap-1">
//                       {statusOptions.map((option) => (
//                         <Link
//                           key={option.value}
//                           href={`/list/messages?${getQueryString({
//                             ...queryParams,
//                             status: option.value || undefined,
//                           })}`}
//                           className={`px-3 py-2 text-xs rounded font-medium ${
//                             queryParams.status === option.value
//                               ? "bg-green-500 text-white"
//                               : "bg-green-50 hover:bg-green-100 text-green-700"
//                           }`}
//                         >
//                           {option.label}
//                         </Link>
//                       ))}
//                     </div>
//                   </div>

//                   {(queryParams.type || queryParams.status) && (
//                     <div className="border-t pt-2">
//                       <Link
//                         href="/list/messages"
//                         className="block text-xs text-blue-600 hover:text-blue-800 font-medium px-3 py-2 rounded hover:bg-blue-50"
//                       >
//                         Clear Filters
//                       </Link>
//                     </div>
//                   )}
//                 </div>
//               </div>
//             </div>

//             {/* NEW MESSAGE BUTTON */}
//             <FormContainer 
//               table="message" 
//               type="create" 
//               relatedData={{ 
//                 users: availableUsers,
//                 groups: currentUser.groupMemberships.map(gm => gm.group)
//               }}
//             />

//             {/* NEW GROUP BUTTON */}
//             {(role === "admin" || role === "teacher") && (
//               <FormContainer 
//                 table="messageGroup" 
//                 type="create" 
//                 relatedData={{ 
//                   classes: availableClasses,
//                   users: availableUsers
//                 }}
//               />
//             )}
//           </div>
//         </div>
//       </div>

//       {/* STATS */}
//       <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-4">
//         <div className="bg-blue-50 p-3 rounded-lg">
//           <h3 className="text-sm font-medium text-blue-800">Total</h3>
//           <p className="text-2xl font-bold text-blue-900">{messageStats.total}</p>
//         </div>
//         <div className="bg-green-50 p-3 rounded-lg">
//           <h3 className="text-sm font-medium text-green-800">Unread</h3>
//           <p className="text-2xl font-bold text-green-900">{messageStats.unread}</p>
//         </div>
//         <div className="bg-purple-50 p-3 rounded-lg">
//           <h3 className="text-sm font-medium text-purple-800">Direct</h3>
//           <p className="text-2xl font-bold text-purple-900">{messageStats.direct}</p>
//         </div>
//         <div className="bg-indigo-50 p-3 rounded-lg">
//           <h3 className="text-sm font-medium text-indigo-800">Group</h3>
//           <p className="text-2xl font-bold text-indigo-900">{messageStats.group}</p>
//         </div>
//         <div className="bg-orange-50 p-3 rounded-lg">
//           <h3 className="text-sm font-medium text-orange-800">Sent</h3>
//           <p className="text-2xl font-bold text-orange-900">{messageStats.sent}</p>
//         </div>
//         <div className="bg-teal-50 p-3 rounded-lg">
//           <h3 className="text-sm font-medium text-teal-800">Received</h3>
//           <p className="text-2xl font-bold text-teal-900">{messageStats.received}</p>
//         </div>
//       </div>

//       {/* TABLE */}
//       <Table columns={columns} renderRow={renderRow} data={messages} />

//       {/* PAGINATION */}
//       <Pagination page={p} count={messageCount} />
//     </div>
//   );
// };

// // Groups View Component
// const GroupsView = ({ 
//   groups, 
//   count, 
//   page, 
//   role, 
//   userId,
//   queryParams 
// }: { 
//   groups: GroupList[];
//   count: number;
//   page: number;
//   role: string;
//   userId: string;
//   queryParams: any;
// }) => {
//   const groupColumns = [
//     { header: "Group", accessor: "group", className: "w-1/3" },
//     { header: "Class", accessor: "class", className: "w-1/4" },
//     { header: "Members", accessor: "members", className: "hidden md:table-cell w-1/6" },
//     { header: "Last Message", accessor: "lastMessage", className: "w-1/4" },
//     { header: "Unread", accessor: "unread", className: "hidden lg:table-cell w-1/12" },
//     { header: "Actions", accessor: "action", className: "w-1/12" },
//   ];

//   const renderGroupRow = (group: GroupList) => {
//     const lastMessage = group.messages[0];
//     const unreadCount = group._count?.messages || 0;
    
//     return (
//       <tr
//         key={group.id}
//         className={`border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-PurpleLight ${
//           unreadCount > 0 ? "bg-blue-50" : ""
//         }`}
//       >
//         <td className="flex items-center gap-4 p-4">
//           <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
//             <Image src="/class.png" alt="Group" width={20} height={20} />
//           </div>
//           <div className="flex flex-col">
//             <h3 className={`font-medium ${unreadCount > 0 ? "font-semibold" : ""}`}>
//               {group.name}
//             </h3>
//             <p className="text-xs text-gray-500">
//               Created {new Date(group.createdAt).toLocaleDateString()}
//             </p>
//           </div>
//         </td>
//         <td className="p-4">
//           <div className="flex flex-col">
//             <span className="font-medium">{group.class.name}</span>
//             <span className="text-xs text-gray-500">
//               Grade {group.class.grade}
//             </span>
//           </div>
//         </td>
//         <td className="hidden md:table-cell p-4">
//           <div className="flex items-center gap-1">
//             <Image src="/user.png" alt="Members" width={16} height={16} />
//             <span className="font-medium">{group.members.length}</span>
//           </div>
//         </td>
//         <td className="p-4">
//           {lastMessage ? (
//             <div className="flex flex-col">
//               <span className="text-sm line-clamp-1">
//                 {lastMessage.sender.name}: {
//                   lastMessage.messageType === "text" 
//                     ? lastMessage.content 
//                     : lastMessage.messageType === "voice"
//                     ? "🎤 Voice message"
//                     : "📎 File attachment"
//                 }
//               </span>
//               <span className="text-xs text-gray-500">
//                 {new Date(lastMessage.createdAt).toLocaleDateString("en-US", {
//                   month: "short",
//                   day: "numeric",
//                   hour: "2-digit",
//                   minute: "2-digit",
//                 })}
//               </span>
//             </div>
//           ) : (
//             <span className="text-gray-500 text-sm">No messages yet</span>
//           )}
//         </td>
//         <td className="hidden lg:table-cell p-4">
//           {unreadCount > 0 && (
//             <span className="px-2 py-1 bg-red-500 text-white rounded-full text-xs font-medium">
//               {unreadCount}
//             </span>
//           )}
//         </td>
//         <td className="p-4">
//           <div className="flex items-center gap-2">
//             <Link
//               href={`/messages/chat?group=${group.id}`}
//               className="w-7 h-7 flex items-center justify-center rounded-full bg-Sky hover:bg-blue-400 transition-colors"
//             >
//               <Image src="/view.png" alt="Open Chat" width={14} height={14} />
//             </Link>
//             {(role === "admin" || group.createdById === userId) && (
//               <FormContainer table="messageGroup" type="delete" id={group.id} />
//             )}
//           </div>
//         </td>
//       </tr>
//     );
//   };

//   return (
//     <>
//       <div className="flex items-center justify-between mb-4">
//         <div className="flex flex-col">
//           <h1 className="hidden md:block text-lg font-semibold">Class Groups</h1>
//           <p className="text-sm text-gray-500">
//             Manage class group conversations
//           </p>
//         </div>
//       </div>

//       <Table columns={groupColumns} renderRow={renderGroupRow} data={groups} />
//       <Pagination page={page} count={count} />
//     </>
//   );
// };

// export default MessagesPage;


import React from 'react'

const MessagesPage = () => {
  return (
    <div className='flex justify-center items-center h-screen'>
      <p className='text-gray-500 text-sm'>Messages feature will be available soon. Stay tuned!</p>
    </div>
  )
}

export default MessagesPage
