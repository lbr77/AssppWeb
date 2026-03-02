import { useEffect, useRef, useState } from "react";
import { useDownloadsStore } from "../store/downloads";
import { useAccounts } from "./useAccounts";
import { useSigningStore } from "../stores/signingStore";
import { hashAccountIdentities } from "../utils/account";

export function useDownloads() {
  const {
    tasks,
    loading,
    setAccountHashes,
    fetchTasks,
    startDownload,
    pauseDownload,
    resumeDownload,
    deleteDownload,
  } = useDownloadsStore();
  const { accounts } = useAccounts();
  const signingAccounts = useSigningStore((state) => state.accounts);
  const hashesRef = useRef("");
  const [hashToEmail, setHashToEmail] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const hashes: string[] = [];
      const hashSet = new Set<string>();
      const map: Record<string, string> = {};

      for (const account of accounts) {
        const accountHashes = await hashAccountIdentities(account);
        for (const hash of accountHashes) {
          if (!hashSet.has(hash)) {
            hashSet.add(hash);
            hashes.push(hash);
          }
          map[hash] = account.email;
        }
      }

      for (const account of signingAccounts) {
        const accountHashes = await hashAccountIdentities({
          directoryServicesIdentifier: account.session.dsid,
          appleId: account.account.email,
          email: account.email,
        });
        for (const hash of accountHashes) {
          if (!hashSet.has(hash)) {
            hashSet.add(hash);
            hashes.push(hash);
          }
          map[hash] = account.email;
        }
      }

      // Use slice() before sort() so we don't mutate the original 'hashes' array
      const key = hashes.slice().sort().join(",");
      if (cancelled || key === hashesRef.current) return;
      hashesRef.current = key;

      setHashToEmail(map);

      setAccountHashes(hashes);
      // Fetch immediately after hashes are set so downloads appear on first visit
      fetchTasks();
    })();
    return () => {
      cancelled = true;
    };
  }, [accounts, signingAccounts, setAccountHashes, fetchTasks]);

  return {
    tasks,
    loading,
    hashToEmail,
    fetchTasks,
    startDownload,
    pauseDownload,
    resumeDownload,
    deleteDownload,
  };
}
