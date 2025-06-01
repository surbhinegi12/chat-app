import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { supabase } from '../../../lib/supabase';
import { MdOutlineLocalPhone } from 'react-icons/md';
import { HiUserAdd } from 'react-icons/hi';

interface AddMembersDialogProps {
  isOpen: boolean;
  onClose: () => void;
  chatId: string;
  currentMembers: Array<{ id: string }>;
  onMemberAdded: () => void;
}

export default function AddMembersDialog({ 
  isOpen, 
  onClose, 
  chatId,
  currentMembers,
  onMemberAdded 
}: AddMembersDialogProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const handleAddMember = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
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

      // Check if user is already a member
      if (currentMembers.some(member => member.id === user.id)) {
        setError('This user is already a member of the chat');
        return;
      }

      // Add member to chat
      const { error: addError } = await supabase
        .from('chat_members')
        .insert({
          chat_id: chatId,
          user_id: user.id
        });

      if (addError) throw addError;

      setSuccess(`${user.full_name} has been added to the chat`);
      setPhoneNumber('');
      onMemberAdded();

      // Clear success message after 2 seconds
      setTimeout(() => {
        setSuccess('');
      }, 2000);

    } catch (err) {
      console.error('Error adding member:', err);
      setError('Failed to add member. Please try again.');
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
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-xl bg-white/90 backdrop-blur-sm p-6 shadow-xl transition-all">
                <Dialog.Title className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <HiUserAdd className="w-5 h-5 mr-2 text-green-500" />
                  Add Member to Chat
                </Dialog.Title>

                <div className="relative">
                  <div className="flex items-center bg-gray-50 rounded-lg px-3 py-2 mb-4">
                    <MdOutlineLocalPhone className="text-gray-400 w-5 h-5" />
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                        setPhoneNumber(val);
                        setError('');
                      }}
                      placeholder="Enter mobile number"
                      className="w-full ml-2 bg-transparent focus:outline-none text-gray-600"
                    />
                  </div>

                  {error && (
                    <p className="text-sm text-red-600 mb-4">{error}</p>
                  )}

                  {success && (
                    <p className="text-sm text-green-600 mb-4">{success}</p>
                  )}

                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg"
                      onClick={onClose}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={phoneNumber.length !== 10 || loading}
                      onClick={handleAddMember}
                      className={`
                        px-4 py-2 text-sm font-medium rounded-lg
                        ${phoneNumber.length === 10 && !loading
                          ? 'bg-green-500 text-white hover:bg-green-600'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }
                      `}
                    >
                      {loading ? 'Adding...' : 'Add Member'}
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