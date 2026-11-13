import GameHub from '@/components/GameHub';
export default function BattleHub() { return <GameHub door="battle" extras={[{href:"/trivia-party",icon:"🍻",title:"PARTY TABLE",copy:"Two to five players on separate phones."},{href:"/trivia-brawl?host=1&topic=grammar",icon:"✍",title:"GRAMMAR",copy:"Invite a friend and choose difficulty."}]} />; }
