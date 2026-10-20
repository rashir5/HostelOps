const Announcement = require('../models/Announcement.model');
const AuditLog = require('../models/AuditLog.model');
const User = require('../models/User.model');
const Student = require('../models/Student.model');
const smsService = require('../services/sms.service');

// Get announcements relevant to the user
const getAnnouncements = async (req, res, next) => {
  try {
    const role = req.user?.role || 'All';
    const filter = {
      $or: [{ targetRole: 'All' }, { targetRole: role }],
    };

    const announcements = await Announcement.find(filter)
      .sort({ isPinned: -1, createdAt: -1 })
      .limit(30);

    res.json({ success: true, count: announcements.length, data: announcements });
  } catch (error) {
    next(error);
  }
};

// Create announcement (Admin / Warden)
const createAnnouncement = async (req, res, next) => {
  try {
    const { title, content, targetRole, category, isPinned } = req.body;

    const announcement = await Announcement.create({
      title,
      content,
      targetRole: targetRole || 'All',
      category: category || 'General',
      isPinned: Boolean(isPinned),
      postedBy: req.user._id,
      postedByName: req.user.name,
    });

    await AuditLog.create({
      action: 'Announcement Created',
      performedBy: req.user._id,
      performedByName: req.user.name,
      role: req.user.role,
      targetType: 'Announcement',
      targetId: announcement._id.toString(),
      details: `Posted "${title}" for audience: ${targetRole || 'All'}`,
    });

    res.status(201).json({
      success: true,
      message: 'Announcement published successfully',
      data: announcement,
    });
  } catch (error) {
    next(error);
  }
};

// Delete announcement (Admin)
const deleteAnnouncement = async (req, res, next) => {
  try {
    const { id } = req.params;
    await Announcement.findByIdAndDelete(id);
    res.json({ success: true, message: 'Announcement deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// Emergency SOS Broadcast & Real/Simulated SMS Gateway
const sendEmergencySos = async (req, res, next) => {
  try {
    const { title, message, targetAudience = 'All', category = 'Medical Emergency', location = 'Hostel Campus' } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Emergency message content is required' });
    }

    // Map target audience to targetRole and calculate recipient metadata
    let targetRole = 'All';
    let recipientLabel = 'Campus-Wide (All Residents & Staff)';
    let recipientCount = 120;

    // Fetch actual mobile phone numbers from Student database
    const studentQuery = { isActive: { $ne: false } };
    const studentsInDb = await Student.find(studentQuery).select('name phone guardianPhone');
    
    const targetPhones = [];
    studentsInDb.forEach((s) => {
      if (s.phone) targetPhones.push(s.phone);
      if (s.guardianPhone) targetPhones.push(s.guardianPhone);
    });

    if (targetAudience === 'student') {
      targetRole = 'student';
      recipientLabel = 'All Hostel Resident Students';
      recipientCount = studentsInDb.length || 85;
    } else if (targetAudience === 'warden') {
      targetRole = 'warden';
      recipientLabel = 'Hostel Wardens & Gate Security Desk';
      recipientCount = 6;
    } else if (targetAudience === 'mentor') {
      targetRole = 'mentor';
      recipientLabel = 'Senior Student Mentors';
      recipientCount = 14;
    } else if (targetAudience === 'admin') {
      targetRole = 'All';
      recipientLabel = 'Hostel Admin & Campus Estate Office';
      recipientCount = 5;
    } else {
      targetRole = 'All';
      recipientLabel = 'All Students, Mentors, Wardens & Admins';
      const count = await User.countDocuments({ isActive: true });
      recipientCount = count || 110;
    }

    const sosTitle = `🚨 SOS ALERT: ${title || category}`;
    const fullContent = `[URGENT SPIT CAMPUS DISPATCH]\nSender: ${req.user.name} (${req.user.role.toUpperCase()})\nLocation / Context: ${location}\nEmergency Type: ${category}\n\nEmergency Message:\n${message.trim()}\n\n[SPIT Emergency Cellular SMS Relay]`;

    const carrierSmsText = `[SPIT SOS] ${category}: ${message.slice(0, 100)} - Location: ${location}. Triggered by ${req.user.name}. In immediate danger contact Hostel Desk.`;

    // Dispatch via SMS Service (Automatically chooses Live MSG91 / Fast2SMS if keys are present, or Handover Simulation Mode)
    const smsResult = await smsService.dispatchSms({
      phoneNumbers: targetPhones,
      message: carrierSmsText,
      category,
      location,
      senderName: req.user.name,
    });

    const announcement = await Announcement.create({
      title: sosTitle,
      content: fullContent,
      targetRole: targetRole,
      category: 'Urgent Notice',
      isPinned: true,
      postedBy: req.user._id,
      postedByName: `${req.user.name} (${req.user.role})`,
    });

    await AuditLog.create({
      action: 'Emergency SOS Broadcast',
      performedBy: req.user._id,
      performedByName: req.user.name,
      role: req.user.role,
      targetType: 'EmergencySOS',
      targetId: announcement._id.toString(),
      details: `Emergency SOS triggered by ${req.user.name} (${req.user.role}) to audience "${recipientLabel}". Category: ${category}. Location: ${location}. SMS Mode: ${smsResult.mode}.`,
    });

    res.status(201).json({
      success: true,
      message: smsResult.isLive
        ? 'Emergency SOS broadcast & live cellular SMS dispatched to phones!'
        : 'Emergency SOS broadcast & handover simulated SMS dispatched successfully',
      data: {
        announcement,
        smsSummary: {
          gateway: smsResult.gateway,
          provider: smsResult.provider,
          mode: smsResult.mode,
          isLive: smsResult.isLive,
          cost: smsResult.cost,
          status: smsResult.status,
          recipientGroup: recipientLabel,
          recipientCount: smsResult.recipientCount || recipientCount,
          sampleRecipients: smsResult.sampleRecipients,
          notice: smsResult.notice,
          sentAt: new Date().toISOString(),
          sender: `${req.user.name} (${req.user.role})`,
          category: category,
          location: location,
          sampleSmsText: carrierSmsText,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAnnouncements,
  createAnnouncement,
  deleteAnnouncement,
  sendEmergencySos,
};
