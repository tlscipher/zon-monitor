import { EventEmitter } from "ws";
import { Worker } from "worker_threads";
import { Offer } from "../types/amazon";
import { Proxy, Site } from "../types/etc";
import { log } from "./etc/utls";

export default class MonitorHandler extends EventEmitter {
  private spawnCount: number;
  private worker?: Worker;
  constructor(
    readonly monitorPath: string,
    private accountsPath: string,
    readonly site: Site,

    private proxies: Proxy[]
  ) {
    super();
    this.spawnNew();
    this.spawnCount = 0;
  }

  private addWorkerListeners() {
    if (!this.worker) return;
    this.worker.on("message", (offers: Offer[]) => {
      this.emit("new-offers", offers);
    });

    this.worker.on("error", (error: string) => console.error(`[${this.site}] ` + error.toString()));

    this.worker.on("exit", (code: number) => {
      log(`[${this.site}] Stopped with exit code ${code}`, "red");

      if (this.spawnCount <= 5) {
        log(`Attempting to respawn ${this.site}`, "yellow");
        this.spawnNew();
      } else {
        log(`Not respawning ${this.site}, respawned more than 5 times`, "red");
      }
    });
  }

  private spawnNew() {
    this.worker = new Worker(this.monitorPath, {
      workerData: {
        proxies: this.proxies,
        accountsPath: this.accountsPath,
      },
    });
    log(`Spawned new ${this.site} worker`, "green");
    this.spawnCount++;
    this.addWorkerListeners();
  }
}
