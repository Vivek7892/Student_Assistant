import { useState } from 'react'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { User, Mail, BookOpen, Award, Edit3, Camera, Save } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, Button, Input, Badge, Avatar } from '@/components/ui'
import { useAuthStore } from '@/store/authStore'
import { useUpdateProfile } from '@/api/auth'

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user)
  const [editing, setEditing] = useState(false)
  const { mutate: updateProfile, isPending } = useUpdateProfile()
  const { register, handleSubmit } = useForm({
    defaultValues: {
      first_name: user?.first_name,
      last_name: user?.last_name,
      student_profile: {
        usn: user?.student_profile?.usn,
        department: user?.student_profile?.department,
        bio: user?.student_profile?.bio,
        current_semester: user?.student_profile?.current_semester,
      },
      teacher_profile: {
        department: user?.teacher_profile?.department,
        qualification: user?.teacher_profile?.qualification,
        experience_years: user?.teacher_profile?.experience_years,
        bio: user?.teacher_profile?.bio,
      },
    },
  })

  const onSubmit = (data: any) => {
    updateProfile(data, { onSuccess: () => setEditing(false) })
  }

  if (!user) return null

  return (
    <DashboardLayout title="Profile">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Profile header */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="text-center space-y-4">
            <div className="relative inline-block">
              <Avatar name={user.full_name} src={user.avatar} size="xl" />
              {editing && (
                <button className="absolute -bottom-1 -right-1 h-8 w-8 bg-primary rounded-full flex items-center justify-center text-white shadow-lg">
                  <Camera className="h-4 w-4" />
                </button>
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold">{user.full_name}</h2>
              <p className="text-muted-foreground text-sm">{user.email}</p>
              <div className="flex items-center justify-center gap-2 mt-2">
                <Badge variant={user.is_verified ? 'success' : 'warning'} dot>
                  {user.is_verified ? 'Verified' : 'Unverified'}
                </Badge>
                <Badge variant="secondary" className="capitalize">{user.role}</Badge>
              </div>
            </div>
            <Button variant={editing ? 'outline' : 'default'} size="sm" onClick={() => setEditing(!editing)}>
              {editing ? 'Cancel' : <><Edit3 className="h-4 w-4" /> Edit Profile</>}
            </Button>
          </Card>
        </motion.div>

        {/* Profile form */}
        <form onSubmit={handleSubmit(onSubmit)}>
          <Card className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2"><User className="h-4 w-4 text-primary" /> Personal Info</h3>
            <div className="grid grid-cols-2 gap-4">
              <Input label="First Name" disabled={!editing} {...register('first_name')} />
              <Input label="Last Name" disabled={!editing} {...register('last_name')} />
            </div>
            <Input label="Email" value={user.email} disabled icon={<Mail className="h-4 w-4" />} />

            {user.role === 'student' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="USN" disabled={!editing} {...register('student_profile.usn')} />
                  <Input label="Current Semester" type="number" disabled={!editing} {...register('student_profile.current_semester')} />
                </div>
                <Input label="Department" disabled={!editing} {...register('student_profile.department')} />
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Bio</label>
                  <textarea
                    disabled={!editing}
                    rows={3}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
                    {...register('student_profile.bio')}
                  />
                </div>
              </>
            )}

            {user.role === 'teacher' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Department" disabled={!editing} {...register('teacher_profile.department')} />
                  <Input label="Experience (years)" type="number" disabled={!editing} {...register('teacher_profile.experience_years')} />
                </div>
                <Input label="Qualification" disabled={!editing} {...register('teacher_profile.qualification')} />
              </>
            )}

            {editing && (
              <Button type="submit" loading={isPending}><Save className="h-4 w-4" /> Save Changes</Button>
            )}
          </Card>
        </form>
      </div>
    </DashboardLayout>
  )
}
