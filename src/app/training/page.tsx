import { redirect } from 'next/navigation';

export default function TrainingPage() {
  redirect('/arena?view=mini-games');
}