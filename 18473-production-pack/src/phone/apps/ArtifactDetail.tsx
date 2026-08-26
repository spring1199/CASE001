import { useRef } from 'react';

import { AudioNote } from '@/phone/components/AudioNote';
import { MetadataDialog } from '@/phone/components/MetadataDialog';
import { VisualDialog, VisualMedia } from '@/phone/components/VisualDialog';
import type {
  DeepReadonly,
  PhoneDeepLinkTarget,
  PhoneItem,
  PhoneVisual,
} from '@/phone/data/schema';

type ArtifactDetailProps = Readonly<{
  item: DeepReadonly<PhoneItem>;
  onOpenDeepLink(target: DeepReadonly<PhoneDeepLinkTarget>): void;
}>;

const MESSAGE_DIRECTION_LABELS = {
  incoming: 'Ирсэн',
  outgoing: 'Илгээсэн',
  system: 'Системийн',
} as const;

type VisualArtifactProps = Readonly<{
  visualId: string;
  title: string;
  visual: DeepReadonly<PhoneVisual>;
}>;

function VisualArtifact({ visualId, title, visual }: VisualArtifactProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const captionId = `${visualId}-visual-caption`;

  return (
    <>
      <div data-visual-artifact={visualId}>
        <figure>
          <VisualMedia visual={visual} />
          <figcaption id={captionId}>{visual.description}</figcaption>
        </figure>
        <button
          type="button"
          aria-haspopup="dialog"
          aria-controls={`${visualId}-visual-dialog`}
          aria-describedby={captionId}
          onClick={() => dialogRef.current?.showModal()}
          style={{ minHeight: 44, minWidth: 44 }}
        >
          Зургийг томруулах
        </button>
      </div>
      <VisualDialog
        dialogRef={dialogRef}
        visualId={visualId}
        title={title}
        visual={visual}
      />
    </>
  );
}

function BodyText({ body }: Readonly<{ body: string }>) {
  return (
    <div>
      {body.split('\n').map((line, index) => (
        <p key={`${index}:${line}`}>{line}</p>
      ))}
    </div>
  );
}

export function ArtifactDetail({ item, onOpenDeepLink }: ArtifactDetailProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <article aria-labelledby={`${item.id}-title`}>
      <header>
        <h2 id={`${item.id}-title`}>{item.title}</h2>
        {item.subtitle ? <p>{item.subtitle}</p> : null}
        {item.timestampLabel ? <p>{item.timestampLabel}</p> : null}
      </header>

      {item.kind === 'message-thread' ? (
        <ol aria-label="Зурвасын түүх">
          {item.messages.map((message) => (
            <li key={message.id}>
              <article
                data-message-direction={message.direction}
                aria-label={`${MESSAGE_DIRECTION_LABELS[message.direction]} зурвас · ${message.senderLabel} · ${message.timestampLabel}`}
              >
                <header>
                  <strong>{message.senderLabel}</strong>
                  <span>{MESSAGE_DIRECTION_LABELS[message.direction]}</span>
                  <time>{message.timestampLabel}</time>
                  {!message.read ? <span>Уншаагүй</span> : null}
                </header>
                {message.body ? <BodyText body={message.body} /> : null}
                {message.visual ? (
                  <VisualArtifact
                    visualId={message.id}
                    title={`${message.senderLabel} · ${message.timestampLabel}`}
                    visual={message.visual}
                  />
                ) : null}
                {message.audio ? (
                  <AudioNote audio={message.audio} label={`${message.senderLabel} · Дуут зурвас`} />
                ) : null}
              </article>
            </li>
          ))}
        </ol>
      ) : (
        <>
          {item.body ? <BodyText body={item.body} /> : null}
          {item.visual ? (
            <VisualArtifact visualId={item.id} title={item.title} visual={item.visual} />
          ) : null}
          {item.audio ? <AudioNote audio={item.audio} /> : null}
        </>
      )}

      {item.metadata && item.metadata.length > 0 ? (
        <>
          <button
            type="button"
            aria-haspopup="dialog"
            aria-controls={`${item.id}-metadata-dialog`}
            onClick={() => dialogRef.current?.showModal()}
            style={{ minHeight: 44, minWidth: 44 }}
          >
            Метадата шалгах
          </button>
          <MetadataDialog
            dialogRef={dialogRef}
            itemId={item.id}
            title={item.title}
            rows={item.metadata}
          />
        </>
      ) : null}

      {item.deepLinks && item.deepLinks.length > 0 ? (
        <nav aria-label="Холбоотой зүйлс">
          {item.deepLinks.map((link) => (
            <button
              key={`${link.target.appId}:${link.target.itemId ?? ''}`}
              type="button"
              onClick={() => onOpenDeepLink(link.target)}
              style={{ minHeight: 44, minWidth: 44 }}
            >
              {link.label}
            </button>
          ))}
        </nav>
      ) : null}
    </article>
  );
}
