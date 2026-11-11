"use client";

import { useEffect, useState } from "react";

import { Button } from "./ui";

export function CopyButton({ value, disabled = false }: { value: string; disabled?: boolean }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timeout = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timeout);
  }, [copied]);

  async function copy() {
    setFailed(false);
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(value);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = value;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        textarea.remove();
      }
      setCopied(true);
    } catch {
      setFailed(true);
    }
  }

  return (
    <>
      <Button type="button" variant="secondary" onClick={copy} disabled={disabled || !value}>
        {copied ? "Copied" : "Copy"}
      </Button>
      {failed && <span className="copy-error">Copy failed. Select the URL and copy it manually.</span>}
    </>
  );
}
