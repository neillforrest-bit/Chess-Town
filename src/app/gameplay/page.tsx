import { redirect } from 'next/navigation';

export default function GameplayPage() {
  redirect('/arena?view=play');
}