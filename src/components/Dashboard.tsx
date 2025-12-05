import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  Users,
  Plus,
  Settings,
  FileText,
  Bell,
  CheckCircle,
  XCircle,
  UserPlus,
  Edit,
  Trash2,
  Eye,
  ChevronDown,
  ChevronUp,
  UserCheck,
  Shield,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import { db } from '../lib/firebase';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
  serverTimestamp,
  orderBy,
  getDoc,
} from 'firebase/firestore';
import AddCard from './AddCard';
import CardList from './CardList';
import RequestNewCard from './RequestNewCard';
import HostRequestForm from './HostRequestForm';
import ManageHomepage from './ManageHomepage';
import ManageHosts from './ManageHosts';
import AssignCards from './AssignCards';
import UserSettings from './UserSettings';
import MfaResetRequest from './MfaResetRequest';

interface Booking {
  id: string;
  userId: string;
  cardId: string;
  date: string;
  timeSlot: string;
  timeSlotsArray?: string[];
  openSlots?: number;
  perSlotPrice?: number;
  joinedSlots?: number;
  bookingTime: any;
  cardTitle?: string;
  cardType?: string;
  cardLocation?: string;
}

interface Request {
  id: string;
  userId: string;
  userEmail: string;
  userDisplayName?: string;
  userPhoneNumber?: string;
  message: string;
  status: 'pending' | 'approved' | 'rejected';
  requestType: 'host-request' | 'new-card' | 'mfa-reset';
  cardData?: any;
  createdAt: any;
  updatedAt: any;
  adminResponse?: string;
}

interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: any;
  joinedByUserId?: string;
  joinedByEmail?: string;
  joinedSlots?: number;
  bookingId?: string;
  joinedByDisplayName?: string;
  joinedByPhoneNumber?: string;
  bookedByUserId?: string;
  bookedByEmail?: string;
  bookedByDisplayName?: string;
  bookedByPhoneNumber?: string;
  cardTitle?: string;
  bookingDate?: string;
  bookingTimeSlots?: string[];
}

const ITEMS_PER_PAGE = 6;

// Request Item Component (was missing)
const RequestItem: React.FC<{
  request: Request;
  onApprove: (id: string, request: Request, response: string) => void;
  onReject: (id: string, request: Request, response: string) => void;
  formatTime: (timestamp: any) => string;
}> = ({ request, onApprove, onReject, formatTime }) => {
  const [adminResponse, setAdminResponse] = useState('');
  const [isResponding, setIsResponding] = useState(false);

  const handleApprove = () => {
    if (!adminResponse.trim()) {
      alert('Please provide a response message');
      return;
    }
    onApprove(request.id, request, adminResponse);
    setAdminResponse('');
    setIsResponding(false);
  };

  const handleReject = () => {
    if (!adminResponse.trim()) {
      alert('Please provide a response message');
      return;
    }
    onReject(request.id, request, adminResponse);
    setAdminResponse('');
    setIsResponding(false);
  };

  const getRequestTypeLabel = (type: string) => {
    switch (type) {
      case 'host-request': return 'Host Request';
      case 'new-card': return 'New Card Request';
      case 'mfa-reset': return 'MFA Reset Request';
      default: return 'Request';
    }
  };

  return (
    <div className="border border-gray-200 rounded-2xl p-6 bg-white shadow-md">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h4 className="font-bold text-lg text-gray-900">
            {getRequestTypeLabel(request.requestType)}
          </h4>
          <p className="text-gray-600">From: {request.userDisplayName || request.userEmail}</p>
          {request.userPhoneNumber && (
            <p className="text-gray-500 text-sm">📞 {request.userPhoneNumber}</p>
          )}
          <p className="text-xs text-gray-500 mt-2">
            {formatTime(request.createdAt)}
          </p>
        </div>
        <span className={`px-4 py-2 rounded-full text-sm font-bold ${
          request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
          request.status === 'approved' ? 'bg-green-100 text-green-800' :
          'bg-red-100 text-red-800'
        }`}>
          {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
        </span>
      </div>

      <div className="mb-4">
        <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">{request.message}</p>
      </div>

      {request.cardData && (
        <div className="mb-4 bg-gray-50 p-4 rounded-lg">
          <h5 className="font-semibold mb-2">Venue Details:</h5>
          <div className="text-sm space-y-1">
            <p><strong>Title:</strong> {request.cardData.title}</p>
            <p><strong>Type:</strong> {request.cardData.type}</p>
            <p><strong>Location:</strong> {request.cardData.location}</p>
            <p><strong>Price:</strong> ₹{request.cardData.pricePerHour}/hour</p>
          </div>
        </div>
      )}

      {request.status === 'pending' && (
        <div className="space-y-4">
          {!isResponding ? (
            <button
              onClick={() => setIsResponding(true)}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-semibold"
            >
              Respond to Request
            </button>
          ) : (
            <div className="space-y-4">
              <textarea
                value={adminResponse}
                onChange={(e) => setAdminResponse(e.target.value)}
                placeholder="Your response to the user..."
                rows={3}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              />
              <div className="flex gap-3">
                <button
                  onClick={handleApprove}
                  className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-bold"
                >
                  Approve
                </button>
                <button
                  onClick={handleReject}
                  className="flex-1 bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 font-bold"
                >
                  Reject
                </button>
                <button
                  onClick={() => {
                    setIsResponding(false);
                    setAdminResponse('');
                  }}
                  className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const Dashboard: React.FC = () => {
  const { user, hasRole, userProfile } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('notifications');
  const [activeRequestTab, setActiveRequestTab] = useState('host-requests');

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingsPage, setBookingsPage] = useState(1);
  const [requests, setRequests] = useState<Request[]>([]);
  const [requestsPage, setRequestsPage] = useState(1);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsPage, setNotificationsPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [expandedBookings, setExpandedBookings] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    setLoading(true);
    const unsubs: (() => void)[] = [];

    // Bookings
    const bookingsQuery = query(
      collection(db, 'bookings'),
      where('userId', '==', user.uid),
      orderBy('bookingTime', 'desc')
    );

    const unsubBookings = onSnapshot(bookingsQuery, async (snapshot) => {
      const loaded: Booking[] = [];
      for (const d of snapshot.docs) {
        const data = d.data();
        const booking: Booking = { id: d.id, ...data } as Booking;

        if (booking.cardId) {
          try {
            const cardSnap = await getDoc(doc(db, 'cards', booking.cardId));
            if (cardSnap.exists()) {
              const c = cardSnap.data();
              booking.cardTitle = c.title;
              booking.cardType = c.type;
              booking.cardLocation = c.location;
            }
          } catch (err) {
            console.error('Card fetch error:', err);
          }
        }
        loaded.push(booking);
      }
      setBookings(loaded);
      setLoading(false);
    });
    unsubs.push(unsubBookings);

    // Admin requests
    if (hasRole('admin')) {
      const reqQuery = query(collection(db, 'Requests'), orderBy('createdAt', 'desc'));
      const unsubReq = onSnapshot(reqQuery, (snap) => {
        setRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Request)));
      });
      unsubs.push(unsubReq);
    }

    // Notifications
    const notifQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubNotif = onSnapshot(notifQuery, (snap) => {
      setNotifications(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Notification)));
    });
    unsubs.push(unsubNotif);

    return () => unsubs.forEach((u) => u());
  }, [user, hasRole, navigate]);

  // Request handling functions (same as before)
  const handleApproveRequest = async (id: string, req: Request, response: string) => {
    if (!response.trim()) return alert('Response required');
    try {
      if (req.requestType === 'host-request') {
        await updateDoc(doc(db, 'users', req.userId), { role: 'host' });
        if (req.cardData) {
          await addDoc(collection(db, 'cards'), {
            ...req.cardData,
            userId: req.userId,
            assignedHost: req.userId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      } else if (req.requestType === 'new-card' && req.cardData) {
        await addDoc(collection(db, 'cards'), {
          ...req.cardData,
          userId: req.userId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else if (req.requestType === 'mfa-reset') {
        await updateDoc(doc(db, 'users', req.userId), { mfaEnabled: false, mfaSecret: '' });
      }

      await updateDoc(doc(db, 'Requests', id), { status: 'approved', adminResponse: response, updatedAt: serverTimestamp() });
      await addDoc(collection(db, 'notifications'), {
        userId: req.userId,
        type: 'request_approved',
        title: 'Request Approved',
        message: response,
        read: false,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.error(err);
      alert('Failed');
    }
  };

  const handleRejectRequest = async (id: string, req: Request, response: string) => {
    if (!response.trim()) return alert('Response required');
    try {
      await updateDoc(doc(db, 'Requests', id), { status: 'rejected', adminResponse: response, updatedAt: serverTimestamp() });
      await addDoc(collection(db, 'notifications'), {
        userId: req.userId,
        type: 'request_rejected',
        title: 'Request Rejected',
        message: response,
        read: false,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.error(err);
      alert('Failed');
    }
  };

  const markRead = (id: string) => updateDoc(doc(db, 'notifications', id), { read: true });
  const deleteNotif = (id: string) => deleteDoc(doc(db, 'notifications', id));
  const viewReceipt = (id: string) => navigate(`/receipt/${id}`);

  const toggleExpand = (id: string) => setExpandedBookings((s) => {
    const n = new Set(s);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  const updateSlots = async (id: string, slots: number) => {
    if (slots >= 0) await updateDoc(doc(db, 'bookings', id), { openSlots: slots });
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  const formatTime = (ts: any) => ts?.toDate?.()?.toLocaleString() || 'Unknown';
  const isCompleted = (b: Booking) => new Date(`${b.date} ${b.timeSlot}`) < new Date();

  const upcoming = bookings.filter((b) => !isCompleted(b));
  const completed = bookings.filter(isCompleted);
  const unread = notifications.filter((n) => !n.read).length;

  const hostReqs = requests.filter((r) => r.requestType === 'host-request' || r.requestType === 'new-card');
  const mfaReqs = requests.filter((r) => r.requestType === 'mfa-reset');

  const paginate = (items: any[], page: number) => items.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
  const pages = (items: any[]) => Math.ceil(items.length / ITEMS_PER_PAGE) || 1;

  const Pagination = ({ page, total, setPage }: { page: number; total: number; setPage: (p: number) => void }) => total <= 1 ? null : (
    <div className="flex justify-center gap-3 mt-6">
      <button onClick={() => setPage(page - 1)} disabled={page === 1} className="p-2 disabled:opacity-50"><ChevronLeft /></button>
      <span className="px-3 py-1">Page {page} of {total}</span>
      <button onClick={() => setPage(page + 1)} disabled={page === total} className="p-2 disabled:opacity-50"><ChevronRight /></button>
    </div>
  );

  const roleBadge = (role: string) => {
    const map: Record<string, string> = { user: 'bg-blue-100 text-blue-800', host: 'bg-purple-100 text-purple-800', admin: 'bg-red-100 text-red-800' };
    return <span className={`px-3 py-1 rounded-full text-xs font-medium ${map[role] || 'bg-gray-100'}`}>{role}</span>;
  };

  if (!user) return null;
  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin h-12 w-12 border-b-4 border-blue-600 rounded-full" /></div>;

  const tabs = [
    { id: 'notifications', label: `Notifications${unread ? ` (${unread})` : ''}`, icon: Bell },
    ...(hasRole('user') || hasRole('host') ? [{ id: 'bookings', label: 'Bookings', icon: Calendar }] : []),
    ...(hasRole('user') ? [{ id: 'host-request', label: 'Become Host', icon: UserPlus }] : []),
    ...(hasRole('host') ? [{ id: 'cards', label: 'Your Cards', icon: FileText }, { id: 'request-card', label: 'Request Card', icon: Plus }] : []),
    ...(hasRole('admin') ? [
      { id: 'cards', label: 'All Cards', icon: FileText },
      { id: 'add-card', label: 'Add Card', icon: Plus },
      { id: 'requests', label: 'Requests', icon: FileText },
      { id: 'assign-cards', label: 'Assign Cards', icon: UserCheck },
      { id: 'user-settings', label: 'Users', icon: Users },
      { id: 'manage-homepage', label: 'Homepage', icon: Settings },
      { id: 'manage-hosts', label: 'Hosts', icon: Users },
    ] : []),
    ...(hasRole('user') || hasRole('host') ? [{ id: 'mfa-reset', label: 'MFA Reset', icon: Shield }] : []),
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex items-center gap-3 mt-2">
          <p className="text-lg text-gray-600">Welcome, {userProfile?.displayName || user.email}</p>
          {userProfile?.role && roleBadge(userProfile.role)}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl">
        <div className="border-b border-gray-200">
          <nav className="flex flex-wrap gap-3 p-4 overflow-x-auto">
            {tabs.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-medium transition-all ${
                    activeTab === t.id ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {t.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6 space-y-8">
          {/* Notifications */}
          {activeTab === 'notifications' && (
            <>
              <h2 className="text-2xl font-bold">Notifications</h2>
              {notifications.length === 0 ? (
                <p className="text-center text-gray-500 py-12">No notifications</p>
              ) : (
                <>
                  <div className="space-y-4">
                    {paginate(notifications, notificationsPage).map((n) => (
                      <div key={n.id} className={`p-4 rounded-lg border ${n.read ? 'border-gray-200' : 'border-blue-300 bg-blue-50'}`}>
                        <div className="flex justify-between">
                          <div>
                            <h4 className="font-semibold">{n.title}</h4>
                            <p className="text-sm text-gray-600 mt-1">{n.message}</p>
                            <p className="text-xs text-gray-500 mt-2">{formatTime(n.createdAt)}</p>
                          </div>
                          <div className="flex gap-2">
                            {!n.read && <button onClick={() => markRead(n.id)} className="text-blue-600 text-sm">Mark read</button>}
                            <button onClick={() => deleteNotif(n.id)}><Trash2 className="w-5 h-5 text-red-600" /></button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Pagination page={notificationsPage} total={pages(notifications)} setPage={setNotificationsPage} />
                </>
              )}
            </>
          )}

          {/* Bookings */}
          {activeTab === 'bookings' && (
            <>
              <h2 className="text-2xl font-bold">Your Bookings</h2>
              
              {/* Upcoming */}
              <div>
                <h3 className="text-xl font-semibold mb-4">Upcoming ({upcoming.length})</h3>
                {upcoming.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No upcoming bookings</p>
                ) : (
                  <div className="space-y-4">
                    {upcoming.map((b) => (
                      <div key={b.id} className="border rounded-lg p-5">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold text-lg">{b.cardTitle || 'Loading...'}</h4>
                            <div className="text-sm text-gray-600 space-y-1 mt-2">
                              <p><Calendar className="inline w-4 h-4 mr-2" />{formatDate(b.date)}</p>
                              <p><Clock className="inline w-4 h-4 mr-2" />{b.timeSlot}</p>
                              {b.cardLocation && <p>📍 {b.cardLocation}</p>}
                            </div>
                          </div>
                          <button onClick={() => viewReceipt(b.id)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                            <Eye className="w-5 h-5" />
                          </button>
                        </div>
                        {b.openSlots > 0 && (
                          <div className="mt-4">
                            <button onClick={() => toggleExpand(b.id)} className="text-blue-600 text-sm">
                              Edit open slots {expandedBookings.has(b.id) ? <ChevronUp className="inline" /> : <ChevronDown className="inline" />}
                            </button>
                            {expandedBookings.has(b.id) && (
                              <div className="mt-3 flex gap-2 flex-wrap">
                                {Array.from({ length: b.openSlots }, (_, i) => (
                                  <button key={i} onClick={() => updateSlots(b.id, b.openSlots! - 1)} className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm">
                                    Remove 1 slot
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Completed */}
              <div className="mt-12">
                <h3 className="text-xl font-semibold mb-4">Completed ({completed.length})</h3>
                {completed.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No completed bookings</p>
                ) : (
                  <div className="space-y-4">
                    {completed.map((b) => (
                      <div key={b.id} className="border rounded-lg p-5 bg-gray-50 flex justify-between items-center">
                        <div>
                          <h4 className="font-semibold">{b.cardTitle}</h4>
                          <p className="text-sm text-gray-600">{formatDate(b.date)} • {b.timeSlot}</p>
                        </div>
                        <button onClick={() => viewReceipt(b.id)} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
                          Receipt
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Pagination for bookings */}
              {(upcoming.length > 0 || completed.length > 0) && (
                <Pagination page={bookingsPage} total={pages(bookings)} setPage={setBookingsPage} />
              )}
            </>
          )}

          {/* Cards */}
          {activeTab === 'cards' && (hasRole('host') || hasRole('admin')) && <CardList />}

          {/* Add Card */}
          {activeTab === 'add-card' && hasRole('admin') && <AddCard />}

          {/* Requests (Admin) */}
          {activeTab === 'requests' && hasRole('admin') && (
            <div className="space-y-8">
              <h2 className="text-2xl font-bold">Admin Requests</h2>
              
              <div className="border-b border-gray-200">
                <nav className="flex gap-8">
                  <button
                    onClick={() => setActiveRequestTab('host-requests')}
                    className={`pb-4 px-2 border-b-4 font-semibold transition-colors ${
                      activeRequestTab === 'host-requests'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Venue Requests ({hostReqs.length})
                  </button>
                  <button
                    onClick={() => setActiveRequestTab('mfa-reset')}
                    className={`pb-4 px-2 border-b-4 font-semibold transition-colors ${
                      activeRequestTab === 'mfa-reset'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    MFA Resets ({mfaReqs.length})
                  </button>
                </nav>
              </div>

              {activeRequestTab === 'host-requests' && (
                <div className="space-y-6">
                  {hostReqs.length === 0 ? (
                    <p className="text-center text-gray-500 py-12">No pending venue requests</p>
                  ) : (
                    <>
                      {paginate(hostReqs, requestsPage).map((req) => (
                        <RequestItem
                          key={req.id}
                          request={req}
                          onApprove={handleApproveRequest}
                          onReject={handleRejectRequest}
                          formatTime={formatTime}
                        />
                      ))}
                      <Pagination page={requestsPage} total={pages(hostReqs)} setPage={setRequestsPage} />
                    </>
                  )}
                </div>
              )}

              {activeRequestTab === 'mfa-reset' && (
                <div className="space-y-6">
                  {mfaReqs.length === 0 ? (
                    <p className="text-center text-gray-500 py-12">No pending MFA reset requests</p>
                  ) : (
                    <>
                      {paginate(mfaReqs, requestsPage).map((req) => (
                        <RequestItem
                          key={req.id}
                          request={req}
                          onApprove={handleApproveRequest}
                          onReject={handleRejectRequest}
                          formatTime={formatTime}
                        />
                      ))}
                      <Pagination page={requestsPage} total={pages(mfaReqs)} setPage={setRequestsPage} />
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Other tabs */}
          {activeTab === 'assign-cards' && hasRole('admin') && <AssignCards />}
          {activeTab === 'host-request' && hasRole('user') && <HostRequestForm />}
          {activeTab === 'request-card' && hasRole('host') && <RequestNewCard />}
          {activeTab === 'mfa-reset' && (hasRole('user') || hasRole('host')) && <MfaResetRequest />}
          {activeTab === 'user-settings' && hasRole('admin') && <UserSettings />}
          {activeTab === 'manage-homepage' && hasRole('admin') && <ManageHomepage />}
          {activeTab === 'manage-hosts' && hasRole('admin') && <ManageHosts />}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;