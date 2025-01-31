import React, { useCallback, useEffect } from 'react';
import { Resolved, useJazz } from 'jazz-react';
import { AddTwitPicsInput, TwitImg, TwitTextInput } from './basicComponents/index.tsx';
import { LikeStream, ListOfImages, ReplyStream, Twit, TwitAccountRoot, TwitProfile } from './1_dataModel.ts';
import { createImage } from 'jazz-browser-media-images';

export function CreateTwitForm(
  props: {
    inReplyTo?: Resolved<Twit>;
    onSubmit?: () => void;
    className?: string;
  } = {}
) {
  const { me } = useJazz<TwitProfile, TwitAccountRoot>();

  const [pics, setPics] = React.useState<File[]>([]);

  const onSubmit = useCallback(
    (twitText: string) => {
      const audience = me.root?.peopleWhoCanSeeMyTwits;
      const interactors = me.root?.peopleWhoCanInteractWithMe;
      if (!audience || !interactors) return;

      const twit = audience.createMap<Twit>({
        text: twitText,
        likes: interactors.createStream<LikeStream>().id,
        replies: interactors.createStream<ReplyStream>().id
      });

      me.profile?.twits?.prepend(twit?.id as Twit['id']);

      if (props.inReplyTo) {
        props.inReplyTo.replies?.push(twit.id);
        twit.set({ isReplyTo: props.inReplyTo.id });
      }

      Promise.all(pics.map(pic => createImage(pic, twit.group, 1024))).then(createdPics => {
        twit.set({ images: audience.createList<ListOfImages>(createdPics.map(pic => pic.id)).id });
      });

      setPics([]);
      props.onSubmit?.();
    },
    [me.profile?.twits, me.root?.peopleWhoCanSeeMyTwits, me.root?.peopleWhoCanInteractWithMe, props, pics]
  );

  const [picPreviews, setPicPreviews] = React.useState<string[]>([]);
  useEffect(() => {
    const previews = pics.map(pic => URL.createObjectURL(pic));
    setPicPreviews(previews);
    return () => previews.forEach(preview => URL.revokeObjectURL(preview));
  }, [pics]);

  return (
    <div className={props.className}>
      <TwitTextInput onSubmit={onSubmit} submitButtonLabel={props.inReplyTo ? 'Reply!' : 'Twit!'} />

      {picPreviews.length ? (
        <div className="flex gap-2 mt-2">
          {picPreviews.map(preview => (
            <TwitImg src={preview} />
          ))}
        </div>
      ) : (
        <AddTwitPicsInput
          onChange={(newPics: File[]) => {
            setPics(newPics);
          }}
        />
      )}
    </div>
  );
}
