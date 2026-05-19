import Link from 'next/link';
import { ArrowLeft, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';

async function getMembers() {
  const supabase = await createClient();

  const { data } = await supabase
    .from('profiles')
    .select('id, first_name, surname, phone, role, membership_status, created_at')
    .eq('role', 'member')
    .order('created_at', { ascending: false })
    .limit(50);

  return data || [];
}

export default async function AdminMembersPage() {
  const members = await getMembers();

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200">
        <div className="px-4 py-4 max-w-6xl mx-auto">
          <Link href="/admin" className="inline-flex items-center text-slate-600 text-sm mb-2">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to admin
          </Link>
          <h1 className="text-xl font-bold text-slate-900 mb-1">Members</h1>
          <p className="text-xs text-slate-600">{members.length} member{members.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="px-4 py-4 max-w-6xl mx-auto">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          {members.length > 0 ? (
            <div className="space-y-2">
              {members.map((member: any) => (
                <div key={member.id} className="flex items-center justify-between gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900 truncate">
                        {member.first_name} {member.surname}
                      </div>
                      <div className="text-xs text-slate-600 truncate">{member.phone}</div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs font-semibold text-slate-700 capitalize">
                      {member.membership_status}
                    </div>
                    <div className="text-[10px] text-slate-500">Joined {new Date(member.created_at).toLocaleDateString()}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500 text-sm">No members yet</div>
          )}
        </div>
      </div>
    </div>
  );
}
