import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { supabase } from '../../../lib/supabase';
import { FiSearch } from 'react-icons/fi';
import { MdOutlineLocalPhone } from 'react-icons/md';
import { HiUserGroup } from 'react-icons/hi';
import { BsChatLeftText } from 'react-icons/bs';

interface NewChatDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onChatSelect: (chat: any) => void;
  currentUser: any;
  onChatCreated?: () => void;
}

export default function NewChatDialog({ isOpen, onClose, onChatSelect, currentUser, onChatCreated }: NewChatDialogProps) {
  const [chatType, setChatType] = useState<'private' | 'group'>('private');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [groupName, setGroupName] = useState('');
  const [members, setMembers] = useState<Array<{ id: string; full_name: string }>>([]);
  const [searchResult, setSearchResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setChatType('private');
    setPhoneNumber('');
    setGroupName('');
    setMembers([]);
    setError('');
    setSearchResult(null);
  };

  const handleAddMember = async () => {
    setError('');
    
    // Format phone number to include +91
    const formattedNumber = phoneNumber.startsWith('+91') ? phoneNumber : `+91${phoneNumber}`;

    // Search for user with this phone number
    const { data: user, error: searchError } = await supabase
      .from('users')
      .select('*')
      .eq('mobile_number', formattedNumber)
      .single();

    if (searchError || !user) {
      setError('No user found with this phone number');
      return;
    }

    if (user.id === currentUser.id) {
      setError('You cannot add yourself');
      return;
    }

    if (members.some(m => m.id === user.id)) {
      setError('This user is already added');
      return;
    }

    setMembers([...members, user]);
    setPhoneNumber('');
  };

  const handleCreateChat = async () => {
    setError('');
    setLoading(true);

    try {
      if (chatType === 'private') {
        if (!phoneNumber) {
          setError('Please enter a phone number');
          return;
        }

        // Format phone number to include +91
        const formattedNumber = phoneNumber.startsWith('+91') ? phoneNumber : `+91${phoneNumber}`;

        // Search for user with this phone number
        const { data: user, error: searchError } = await supabase
          .from('users')
          .select('*')
          .eq('mobile_number', formattedNumber)
          .single();

        if (searchError || !user) {
          setError('No user found with this phone number');
          return;
        }

        if (user.id === currentUser.id) {
          setError('You cannot start a chat with yourself');
          return;
        }

        // Check if chat already exists
        const { data: existingChat } = await supabase
          .from('chat_members')
          .select(`
            chat:chats (
              *,
              members:chat_members(
                user:users(*)
              )
            )
          `)
          .eq('user_id', currentUser.id)
          .eq('chat:chats.type', 'private');

        const chat = existingChat?.find((cm: any) => 
          cm.chat.members.some((m: any) => m.user.id === user.id)
        );

        if (chat) {
          onChatSelect(chat.chat);
          onClose();
          return;
        }

        // Create new private chat
        const { data: newChat, error: chatError } = await supabase
          .from('chats')
          .insert({
            type: 'private',
            created_by: currentUser.id
          })
          .select()
          .single();

        if (chatError) throw chatError;

        // Add members to chat
        await Promise.all([
          supabase.from('chat_members').insert({ chat_id: newChat.id, user_id: currentUser.id }),
          supabase.from('chat_members').insert({ chat_id: newChat.id, user_id: user.id })
        ]);

        // Format chat object for selection
        const formattedChat = {
          ...newChat,
          members: [user],
          labels: []
        };

        onChatSelect(formattedChat);
        onChatCreated?.();
      } else {
        // Create group chat
        if (!groupName.trim()) {
          setError('Please enter a group name');
          return;
        }

        if (members.length === 0) {
          setError('Please add at least one member');
          return;
        }

        // Create new group chat
        const { data: newChat, error: chatError } = await supabase
          .from('chats')
          .insert({
            type: 'group',
            name: groupName.trim(),
            created_by: currentUser.id
          })
          .select()
          .single();

        if (chatError) throw chatError;

        // Add all members including current user
        await Promise.all([
          supabase.from('chat_members').insert({ chat_id: newChat.id, user_id: currentUser.id }),
          ...members.map(member => 
            supabase.from('chat_members').insert({ chat_id: newChat.id, user_id: member.id })
          )
        ]);

        // Format chat object for selection
        const formattedChat = {
          ...newChat,
          members: [...members, { id: currentUser.id, full_name: currentUser.full_name }],
          labels: []
        };

        onChatSelect(formattedChat);
        onChatCreated?.();
      }

      onClose();
      resetForm();
    } catch (err) {
      console.error('Error creating chat:', err);
      setError('Failed to create chat. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200 transition-all">
                <Dialog.Title className="text-[22px] font-semibold text-gray-900 mb-6 px-6 pt-6">
                  Start New Chat
                </Dialog.Title>

                {/* Chat Type Selection */}
                <div className="flex space-x-3 mb-6 px-6">
                  <button
                    onClick={() => {
                      setChatType('private');
                      setError('');
                    }}
                    className={`flex-1 flex items-center justify-center px-4 py-3 rounded-lg text-[15px] font-medium transition-colors ${
                      chatType === 'private'
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <BsChatLeftText className="w-5 h-5 mr-2" />
                    Private Chat
                  </button>
                  <button
                    onClick={() => {
                      setChatType('group');
                      setError('');
                    }}
                    className={`flex-1 flex items-center justify-center px-4 py-3 rounded-lg text-[15px] font-medium transition-colors ${
                      chatType === 'group'
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <HiUserGroup className="w-5 h-5 mr-2" />
                    Group Chat
                  </button>
                </div>

                <div className="px-6 space-y-4">
                  {/* Group Name Input (for group chat) */}
                  {chatType === 'group' && (
                    <div className="flex items-center bg-gray-50 rounded-lg px-4 py-3">
                      <HiUserGroup className="text-gray-400 w-5 h-5" />
                      <input
                        type="text"
                        value={groupName}
                        onChange={(e) => {
                          setGroupName(e.target.value);
                          setError('');
                        }}
                        placeholder="Enter group name"
                        className="w-full ml-3 bg-transparent focus:outline-none text-gray-700 placeholder-gray-500 text-[15px]"
                      />
                    </div>
                  )}

                  {/* Phone Number Input */}
                  <div className="flex items-center bg-gray-50 rounded-lg px-4 py-3">
                    <MdOutlineLocalPhone className="text-gray-400 w-5 h-5" />
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                        setPhoneNumber(val);
                        setError('');
                      }}
                      placeholder={chatType === 'group' ? "Add member by phone number" : "Enter mobile number"}
                      className="w-full ml-3 bg-transparent focus:outline-none text-gray-700 placeholder-gray-500 text-[15px]"
                    />
                    {chatType === 'group' && phoneNumber.length === 10 && (
                      <button
                        onClick={handleAddMember}
                        className="ml-2 px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
                      >
                        Add
                      </button>
                    )}
                  </div>

                  {/* Group Members List */}
                  {chatType === 'group' && members.length > 0 && (
                    <div className="mt-4">
                      <h3 className="text-[15px] font-semibold text-gray-700 mb-2">Members:</h3>
                      <div className="space-y-2">
                        {members.map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center justify-between bg-gray-50 px-4 py-3 rounded-lg"
                          >
                            <span className="text-[15px] text-gray-700">{member.full_name}</span>
                            <button
                              onClick={() => setMembers(members.filter(m => m.id !== member.id))}
                              className="text-red-500 hover:text-red-600 font-medium"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {error && (
                    <p className="text-sm text-red-600 font-medium">{error}</p>
                  )}

                  <div className="flex justify-end space-x-3 py-6">
                    <button
                      type="button"
                      className="px-4 py-2.5 text-[15px] font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                      onClick={() => {
                        onClose();
                        resetForm();
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={loading || (chatType === 'private' ? phoneNumber.length !== 10 : !groupName.trim() || members.length === 0)}
                      onClick={handleCreateChat}
                      className={`
                        px-4 py-2.5 text-[15px] font-medium rounded-lg transition-colors
                        ${(!loading && ((chatType === 'private' && phoneNumber.length === 10) || (chatType === 'group' && groupName.trim() && members.length > 0)))
                          ? 'bg-green-500 text-white hover:bg-green-600'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }
                      `}
                    >
                      {loading ? 'Creating...' : 'Start Chat'}
                    </button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
} 