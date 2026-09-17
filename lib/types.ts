export type Role = 'student' | 'staff' | 'admin';
export type ExamStatus = 'draft' | 'published' | 'closed' | 'completed';
export type RegStatus = 'pending' | 'paid' | 'confirmed' | 'cancelled' | 'attended';
export type PayStatus = 'unpaid' | 'pending_verification' | 'paid' | 'failed' | 'refunded';

export interface Exam {
  id: string;
  code: string;
  title: string;
  description: string | null;
  exam_date: string;
  start_time: string;
  end_time: string;
  registration_deadline: string;
  fee: number;
  total_marks: number;
  syllabus_url: string | null;
  status: ExamStatus;
}

export interface ExamCenter {
  id: string;
  name: string;
  address: string;
  city: string;
  capacity: number;
  contact_phone: string | null;
  is_active: boolean;
}

export interface Registration {
  id: string;
  exam_id: string;
  student_id: string;
  center_id: string;
  hall_ticket_no: string;
  status: RegStatus;
  payment_status: PayStatus;
  payment_ref: string | null;
  seat_no: string | null;
  room_no: string | null;
  created_at: string;
  exams?: Exam;
  exam_centers?: ExamCenter;
}

export function formatINR(n: number) {
  return '₹' + Number(n).toFixed(2);
}
