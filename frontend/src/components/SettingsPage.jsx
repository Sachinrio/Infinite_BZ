import React, { useState, useEffect } from 'react';
import { ArrowLeft, Check, X } from 'lucide-react';
import Sidebar from './Sidebar';

export default function SettingsPage({ user, onNavigate, hideSidebar = false, onProfileUpdate }) {
  // ... (hooks remain same)

  // ... (handleSave remains same, update it in next chunk or same if possible)

  // We need to update handleSave to call onProfileUpdate
  // But wait, I can't easily jump lines in one replace call if they are far apart in a Function component without 'multi'.
  // I will use replace_file_content for the prop definition and return logic.
  // And another one for handleSave.
  // Actually, I should use multi_replace for SettingsPage.

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    jobTitle: '',
    company: '',
    bio: '',
    profileImage: null
  });

  const [profileImagePreview, setProfileImagePreview] = useState(null);

  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [followingData, setFollowingData] = useState([]);
  const [followersCount, setFollowersCount] = useState(0);

  // Calculate profile completion percentage
  const calculateProfileCompletion = () => {
    const fields = [
      formData.firstName,
      formData.lastName,
      formData.email,
      formData.phone,
      formData.jobTitle,
      formData.company,
      formData.profileImage
    ];

    const filledFields = fields.filter(field => field && field.trim() !== '').length;
    const totalFields = fields.length;
    return Math.round((filledFields / totalFields) * 100);
  };

  // Update form data when user data is available
  useEffect(() => {
    if (user) {
      // First, populate with Google auth data
      const nameParts = user.full_name ? user.full_name.split(' ') : ['', ''];
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      setFormData(prev => ({
        ...prev,
        firstName: firstName,
        lastName: lastName,
        email: user.email || ''
      }));

      // Then, fetch existing profile data from database
      fetchProfileData();
      fetchFollowersData();
    }
  }, [user]);

  // Fetch followers data when modal is opened
  useEffect(() => {
    if (showFollowingModal) {
      fetchFollowersData();
    }
  }, [showFollowingModal]);

  const fetchProfileData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/v1/user/profile', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });

      if (response.ok) {
        const profileData = await response.json();
        setFormData(prev => ({
          ...prev,
          firstName: profileData.first_name || prev.firstName,
          lastName: profileData.last_name || prev.lastName,
          jobTitle: profileData.job_title || prev.jobTitle,
          company: profileData.company || prev.company,
          phone: profileData.phone || prev.phone,
          bio: profileData.bio || prev.bio,
          profileImage: profileData.profile_image || prev.profileImage
        }));
      }
    } catch (error) {
      console.error('Error fetching profile data:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file.');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size should be less than 5MB.');
        return;
      }

      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageData = e.target.result;
        setProfileImagePreview(imageData);
        setFormData(prev => ({ ...prev, profileImage: imageData }));
      };
      reader.readAsDataURL(file);
    }
  };

  const fetchFollowersData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/api/v1/user/followers', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });

      if (response.ok) {
        const data = await response.json();
        setFollowingData(data.followers || []);
        setFollowersCount(data.count || 0);
      }
    } catch (error) {
      console.error('Error fetching followers data:', error);
    }
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/v1/user/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          first_name: formData.firstName,
          last_name: formData.lastName,
          job_title: formData.jobTitle,
          company: formData.company,
          phone: formData.phone,
          bio: formData.bio,
          profile_image: formData.profileImage || null
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Profile updated successfully:', data);

        // Show success message
        setShowSuccessMessage(true);

        // Hide success message after 1.5 seconds and redirect
        setTimeout(() => {
          setShowSuccessMessage(false);
          // Refresh user data in parent
          if (onProfileUpdate) onProfileUpdate();
          // Redirect to dashboard
          onNavigate('dashboard');
        }, 1500);
      } else {
        const errorData = await response.json();
        console.error('Error updating profile:', errorData);
        alert('Failed to update profile. Please try again.');
      }
    } catch (error) {
      console.error('Error saving data:', error);
      alert('An error occurred while saving. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex font-sans">
      {!hideSidebar && (
        <Sidebar
          activePage="settings"
          onNavigate={(view) => {
            if (view === 'dashboard' || view === 'my-events' || view === 'my-registrations') onNavigate('dashboard');
            else if (view === 'settings') onNavigate('settings');
          }}
          onLogout={() => onNavigate('landing')}
          onCreateClick={() => onNavigate('create-event')}
        />
      )}

      <main className={`flex-1 p-8 ${hideSidebar ? 'flex justify-center' : 'lg:ml-64'}`}>
        <div className={`w-full ${hideSidebar ? 'max-w-5xl' : ''}`}>
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white">Settings</h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Left Sidebar - Profile Card */}
            <div className="lg:col-span-1">
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                <div className="text-center">
                  <div className="w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden flex items-center justify-center">
                    {profileImagePreview || formData.profileImage ? (
                      <img
                        src={profileImagePreview || formData.profileImage}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-2xl font-bold">
                        {formData.firstName && formData.lastName ?
                          `${formData.firstName[0]}${formData.lastName[0]}`.toUpperCase() :
                          'AR'
                        }
                      </div>
                    )}
                  </div>

                  {/* Image Upload Button */}
                  <div className="mb-4">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                      id="profile-image-upload"
                    />
                    <label
                      htmlFor="profile-image-upload"
                      className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-300 hover:bg-slate-600 cursor-pointer transition-colors text-sm"
                    >
                      Choose Image
                    </label>
                    {profileImagePreview && (
                      <div className="text-xs text-slate-400 mt-1">
                        Image selected
                      </div>
                    )}
                    <div className="text-xs text-slate-400 mt-2 cursor-pointer hover:text-slate-300" onClick={() => setShowFollowingModal(true)}>
                      {followersCount} following
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-1">
                    {formData.firstName || formData.lastName ?
                      `${formData.firstName} ${formData.lastName}`.trim() :
                      'Arjun Reddy'
                    }
                  </h3>
                  <p className="text-sm text-blue-400 mb-4">
                    {formData.jobTitle && formData.company ?
                      `${formData.jobTitle} @ ${formData.company}` :
                      'Product Manager @ TechFlow'
                    }
                  </p>

                  <div className="grid grid-cols-3 gap-4 py-4 border-t border-b border-slate-600 mb-6">
                    <div>
                      <div className="text-lg font-bold text-white">{calculateProfileCompletion()}%</div>
                      <div className="text-xs text-slate-400">PROFILE</div>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold ${user?.is_active
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : 'bg-red-500/20 text-red-400 border border-red-500/30'
                        }`}>
                        {user?.is_active ? <Check size={20} /> : <X size={20} />}
                      </div>
                      <div className="text-xs text-slate-400 mt-1">Active</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-white">Pro</div>
                      <div className="text-xs text-slate-400">PLAN</div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-start gap-3 p-3 bg-slate-700 rounded-lg">
                      <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs mt-0.5">✓</div>
                      <div className="text-left">
                        <div className="font-semibold text-sm text-white">12</div>
                        <div className="text-xs text-slate-400">Events Attended</div>
                        <div className="text-xs text-green-400 font-medium">+2 this week</div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-slate-700 rounded-lg">
                      <div className="w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center text-white text-xs mt-0.5">⚡</div>
                      <div className="text-left">
                        <div className="font-semibold text-sm text-white">45</div>
                        <div className="text-xs text-slate-400">Auto-Registrations</div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-slate-700 rounded-lg">
                      <div className="w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs mt-0.5">🔗</div>
                      <div className="text-left">
                        <div className="font-semibold text-sm text-white">3</div>
                        <div className="text-xs text-slate-400">Linked Accounts</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Content - Form */}
            <div className="lg:col-span-3">
              {/* Success Message */}
              {showSuccessMessage && (
                <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <div className="flex items-center gap-2 text-green-400">
                    <span className="text-lg">✓</span>
                    <span className="font-medium">Saved</span>
                  </div>
                </div>
              )}

              {/* Personal Information Form */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-8">
                <h3 className="text-lg font-semibold text-white mb-6">Personal Information</h3>
                <p className="text-xs text-slate-400 mb-6">Used for event registration</p>

                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">First Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 bg-slate-700 border rounded-lg text-white outline-none focus:border-blue-500 ${!formData.firstName ? 'border-red-500' : 'border-slate-600'}`}
                    />
                    {!formData.firstName && <span className="text-xs text-red-500 mt-1 block">First Name is required</span>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Last Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 bg-slate-700 border rounded-lg text-white outline-none focus:border-blue-500 ${!formData.lastName ? 'border-red-500' : 'border-slate-600'}`}
                    />
                    {!formData.lastName && <span className="text-xs text-red-500 mt-1 block">Last Name is required</span>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Email Address <span className="text-red-500">*</span></label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 bg-slate-700 border rounded-lg text-white outline-none focus:border-blue-500 ${!formData.email ? 'border-red-500' : 'border-slate-600'}`}
                    />
                    {!formData.email && <span className="text-xs text-red-500 mt-1 block">Email is required</span>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Phone Number <span className="text-red-500">*</span></label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 bg-slate-700 border rounded-lg text-white outline-none focus:border-blue-500 ${!formData.phone ? 'border-red-500' : 'border-slate-600'}`}
                    />
                    {!formData.phone && <span className="text-xs text-red-500 mt-1 block">Phone Number is required</span>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Job Title <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      name="jobTitle"
                      value={formData.jobTitle}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 bg-slate-700 border rounded-lg text-white outline-none focus:border-blue-500 ${!formData.jobTitle ? 'border-red-500' : 'border-slate-600'}`}
                    />
                    {!formData.jobTitle && <span className="text-xs text-red-500 mt-1 block">Job Title is required</span>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Company <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      name="company"
                      value={formData.company}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 bg-slate-700 border rounded-lg text-white outline-none focus:border-blue-500 ${!formData.company ? 'border-red-500' : 'border-slate-600'}`}
                    />
                    {!formData.company && <span className="text-xs text-red-500 mt-1 block">Company is required</span>}
                  </div>
                </div>



                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Bio / Intro</label>
                  <textarea
                    name="bio"
                    value={formData.bio}
                    onChange={handleInputChange}
                    rows="3"
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex flex-col items-end gap-2 mt-8">
                  <button
                    onClick={handleSave}
                    disabled={calculateProfileCompletion() < 86}
                    className={`px-6 py-2 font-medium rounded-lg flex items-center gap-2 transition-colors ${calculateProfileCompletion() >= 86
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                      }`}
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Following Modal */}
          {showFollowingModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/95 backdrop-blur-md animate-in fade-in duration-200">
              <div className="bg-slate-800 w-full max-w-md mx-4 rounded-3xl shadow-2xl border border-slate-700/50 max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-700">
                  <h3 className="text-xl font-bold text-white">Followers ({followersCount})</h3>
                  <button
                    onClick={() => setShowFollowingModal(false)}
                    className="p-2 hover:bg-slate-700 rounded-full transition-colors"
                  >
                    <X size={20} className="text-slate-400" />
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                  {followingData.length > 0 ? (
                    <div className="space-y-4">
                      {followingData.map((user, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-xl">
                          <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center">
                            {user.profile_image ? (
                              <img
                                src={user.profile_image}
                                alt={user.full_name || user.email}
                                className="w-full h-full object-contain bg-slate-700"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                                {user.first_name && user.last_name ?
                                  `${user.first_name[0]}${user.last_name[0]}`.toUpperCase() :
                                  user.email[0].toUpperCase()
                                }
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-white font-medium text-sm">
                              {user.first_name && user.last_name ?
                                `${user.first_name} ${user.last_name}` :
                                user.full_name || 'User'
                              }
                            </p>
                            <p className="text-slate-400 text-xs">{user.email}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-slate-400 text-sm">No followers yet</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
