"use client";
import { useState, useTransition } from "react";
import Image from "next/image";
import QRCode from "qrcode";
import { Button } from "./ui/button";
export function PrintProtocol({ publicId }: { publicId: string }) {
  const [url, setUrl] = useState("");
  const [qr, setQr] = useState("");
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  return (
    <>
      <div className="no-print my-6 flex flex-wrap gap-3">
        <Button
          variant="outline"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const key = `protocol:${publicId}`;
              const raw = sessionStorage.getItem(key);
              sessionStorage.removeItem(key);
              if (!raw) {
                setMessage(
                  "Nenhum acesso disponível nesta aba. Volte ao atendimento e gere um novo link; o anterior será revogado.",
                );
                return;
              }
              const link = `${window.location.origin}/portal/acesso#${raw}`;
              setUrl(link);
              setQr(await QRCode.toDataURL(link, { width: 200, margin: 1 }));
            })
          }
        >
          Incluir acesso gerado nesta aba
        </Button>
        <Button onClick={() => window.print()}>Imprimir / Salvar PDF</Button>
      </div>
      {message && (
        <p role="status" className="notice no-print mb-5">
          {message}
        </p>
      )}
      {url ? (
        <section className="mt-8 break-inside-avoid border-t border-border pt-6">
          <h2 className="text-lg">Suas orientações, sempre à mão</h2>
          <p className="my-3 text-sm">
            Leia o QR Code ou acesse o link. Este acesso é pessoal, limitado e
            pode ser revogado pela equipe.
          </p>
          {qr && (
            <Image
              unoptimized
              src={qr}
              alt="QR Code do acesso individual às orientações"
              width={160}
              height={160}
            />
          )}
          <p className="mt-3 break-all text-[10px]">{url}</p>
        </section>
      ) : (
        <p className="mt-7 text-sm muted">
          Acesso individual ainda não incluído neste protocolo. Solicite o link
          à equipe.
        </p>
      )}
    </>
  );
}
