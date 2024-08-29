import { useLockFn } from "ahooks";
import dayjs from "dayjs";
import { useSetAtom } from "jotai";
import { lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { UpdaterIgnoredAtom } from "@/store/updater";
import { formatError } from "@/utils";
import { message } from "@/utils/notification";
import { Button } from "@mui/material";
import { BaseDialog, BaseDialogProps, cn } from "@nyanpasu/ui";
import { relaunch } from "@tauri-apps/api/process";
import { open as openThat } from "@tauri-apps/api/shell";
import { installUpdate, type UpdateManifest } from "@tauri-apps/api/updater";
import styles from "./updater-dialog.module.scss";

const Markdown = lazy(() => import("react-markdown"));

export interface UpdaterDialogProps extends Omit<BaseDialogProps, "title"> {
  manifest: UpdateManifest;
}

export default function UpdaterDialog({
  open,
  manifest,
  onClose,
  ...others
}: UpdaterDialogProps) {
  const { t } = useTranslation();
  const setUpdaterIgnore = useSetAtom(UpdaterIgnoredAtom);

  const handleUpdate = useLockFn(async () => {
    try {
      // Install the update. This will also restart the app on Windows!
      await installUpdate();

      // On macOS and Linux you will need to restart the app manually.
      // You could use this step to display another confirmation dialog.
      await relaunch();
    } catch (e) {
      console.error(e);
      message(formatError(e), { type: "error", title: t("Error") });
    }
  });

  return (
    <BaseDialog
      {...others}
      title={t("updater.title")}
      open={open}
      onClose={() => {
        setUpdaterIgnore(manifest.version); // TODO: control this behavior
        onClose?.();
      }}
      onOk={handleUpdate}
      close={t("updater.close")}
      ok={t("updater.update")}
      divider
    >
      <div
        className={cn(
          "xs:min-w-[90vw] sm:min-w-[50vw] md:min-w-[33.3vw]",
          styles.UpdaterDialog,
        )}
      >
        <div className="flex items-center justify-between px-2 py-2">
          <div className="flex gap-3">
            <span className="text-xl font-bold">{manifest.version}</span>
            <span className="text-xs text-slate-500">
              {dayjs(manifest.date, "YYYY-MM-DD H:mm:ss Z").format(
                "YYYY-MM-DD HH:mm:ss",
              )}
            </span>
          </div>
          <Button
            variant="contained"
            size="small"
            onClick={() => {
              openThat(
                `https://github.com/LibNyanpasu/clash-nyanpasu/releases/tag/v${manifest.version}`,
              );
            }}
          >
            {t("updater.go")}
          </Button>
        </div>
        <div
          className={cn("h-[50vh] overflow-y-auto p-4", styles.MarkdownContent)}
        >
          <Suspense fallback={<div>{t("loading")}</div>}>
            <Markdown
              components={{
                a(props) {
                  const { children, node, ...rest } = props;
                  return (
                    <a
                      {...rest}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        openThat(node.properties.href);
                      }}
                    >
                      {children}
                    </a>
                  );
                },
              }}
            >
              {manifest.body || "New version available."}
            </Markdown>
          </Suspense>
        </div>
      </div>
    </BaseDialog>
  );
}