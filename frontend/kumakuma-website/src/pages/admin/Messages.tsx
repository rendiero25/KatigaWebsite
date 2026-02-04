import { useState, useEffect } from "react";
import AdminLayout from "../../components/AdminLayout";
import api, { API_BASE_URL } from "../../services/api";

const API_URL = API_BASE_URL;

export default function AdminMessages() {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<any>(null);

  const token = localStorage.getItem("adminToken");

  const fetchData = async () => {
    const res = await fetch(`${API_URL}/contact/submissions`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setMessages(await res.json());
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleMarkRead = async (id: string) => {
    await fetch(`${API_URL}/contact/submissions/${id}/read`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus pesan ini?")) return;
    await fetch(`${API_URL}/contact/submissions/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchData();
    setSelectedMessage(null);
  };

  const unreadCount = messages.filter((m) => !m.isRead).length;

  return (
    <AdminLayout title="Pesan Masuk">
      <div className="flex items-center justify-between mb-6">
        <p className="text-gray-600">
          Total {messages.length} pesan
          {unreadCount > 0 && (
            <span className="ml-2 px-2 py-1 bg-red-100 text-red-600 rounded-full text-xs">
              {unreadCount} belum dibaca
            </span>
          )}
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Message List */}
        <div className="lg:col-span-1 bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
            {messages.map((msg) => (
              <div
                key={msg._id}
                onClick={() => {
                  setSelectedMessage(msg);
                  if (!msg.isRead) handleMarkRead(msg._id);
                }}
                className={`p-4 cursor-pointer hover:bg-gray-50 ${selectedMessage?._id === msg._id ? "bg-indigo-50" : ""} ${!msg.isRead ? "border-l-4 border-indigo-500" : ""}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-gray-900 text-sm">
                    {msg.name}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(msg.date).toLocaleDateString("id-ID")}
                  </span>
                </div>
                <p className="text-sm text-gray-600 truncate">
                  {msg.subject || "No Subject"}
                </p>
                <p className="text-xs text-gray-500 truncate mt-1">
                  {msg.message}
                </p>
              </div>
            ))}
            {messages.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                Belum ada pesan
              </div>
            )}
          </div>
        </div>

        {/* Message Detail */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6">
          {selectedMessage ? (
            <>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedMessage.subject || "No Subject"}
                </h3>
                <button
                  onClick={() => handleDelete(selectedMessage._id)}
                  className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                >
                  Hapus
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                <div>
                  <span className="text-gray-500">Dari:</span>
                  <p className="font-medium text-gray-900">
                    {selectedMessage.name}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Email:</span>
                  <p className="font-medium text-gray-900">
                    {selectedMessage.email}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Telepon:</span>
                  <p className="font-medium text-gray-900">
                    {selectedMessage.phone || "-"}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Tanggal:</span>
                  <p className="font-medium text-gray-900">
                    {new Date(selectedMessage.date).toLocaleString("id-ID")}
                  </p>
                </div>
              </div>
              <div className="border-t pt-6">
                <p className="text-gray-700 whitespace-pre-wrap">
                  {selectedMessage.message}
                </p>
              </div>
              <div className="mt-6 flex gap-3">
                <a
                  href={`mailto:${selectedMessage.email}`}
                  className="flex-1 py-2 px-4 bg-indigo-600 text-white rounded-lg text-center hover:bg-indigo-700"
                >
                  Balas Email
                </a>
                <a
                  href={`https://wa.me/${selectedMessage.phone?.replace(/\D/g, "")}`}
                  target="_blank"
                  className="flex-1 py-2 px-4 bg-green-500 text-white rounded-lg text-center hover:bg-green-600"
                >
                  WhatsApp
                </a>
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400">
              Pilih pesan untuk melihat detail
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
