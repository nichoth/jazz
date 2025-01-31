import { useMemo } from 'react';
import { useJazz } from 'jazz-react';
import { TwitAccountRoot, TwitProfile } from './1_dataModel.ts';
import { CreateTwitForm } from './6_CreateTwitForm.tsx';
import { TwitComponent } from './4_TwitComponent.tsx';
import { MainH1 } from './basicComponents/index.tsx';

export function ChronoFeed() {
  const { me } = useJazz<TwitProfile, TwitAccountRoot>();

  const myTwits = me.profile?.twits;

  const twitsFromFollows = useMemo(
    () => me.profile?.following?.flatMap(follow => follow?.twits || []) || [],
    [me.profile?.following]
  );

  const allTwitsSorted = useMemo(
    () =>
      [...(myTwits || []), ...twitsFromFollows]
        .flatMap(tw => (tw ? (tw.isReplyTo ? [] : tw) : []))
        .sort((a, b) => (b.meta.edits.text?.at?.getTime() || 0) - (a.meta.edits.text?.at?.getTime() || 0)),
    [myTwits, twitsFromFollows]
  );

  return (
    <div className="flex flex-col items-stretch">
      <CreateTwitForm className="mb-10" />
      <MainH1>From people you follow</MainH1>
      {allTwitsSorted?.map(twit => (
        <TwitComponent twit={twit} key={twit.id} />
      ))}
    </div>
  );
}
