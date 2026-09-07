import {
  Component,
  Inject,
  OnInit,
  inject,
  signal
} from '@angular/core';

import {
  MAT_DIALOG_DATA,
  MatDialogRef
} from '@angular/material/dialog';

import { FormsModule } from '@angular/forms';
import { MatIcon } from '@angular/material/icon';
import { DecimalPipe } from '@angular/common';
import { forkJoin } from 'rxjs';

import { Trade } from '../../core/models/trade.model';
import { TradesService } from '../../core/services/trades.service';
import { TradeEvaluationRequest } from '../../core/models/trade-evaluation-request.model';
import { TradeEvaluationScreenshot } from '../../core/models/trade-evaluation-screenshot.model';
import {MatTooltip} from '@angular/material/tooltip';

export interface TradeEvaluationDialogData {
  trade: Trade;
}

@Component({
  selector: 'app-trade-evaluation-dialog',
  standalone: true,
  imports: [
    FormsModule,
    MatIcon,
    MatTooltip
  ],
  templateUrl: './trade-evaluation-dialog.html',
  styleUrl: './trade-evaluation-dialog.scss'
})
export class TradeEvaluationDialog implements OnInit {

  private readonly tradesService = inject(TradesService);

  // =========================================
  // EVALUATION
  // =========================================

  positivePoints = signal<string[]>([]);

  negativePoints = signal<string[]>([]);

  comment = signal<string>('');


  // =========================================
  // SCREENSHOTS
  // =========================================

  // Screenshots already saved in the backend
  screenshots =
    signal<TradeEvaluationScreenshot[]>([]);

  // Files selected but not uploaded yet
  screenshotsToUpload =
    signal<File[]>([]);

  // Local previews for newly selected files
  screenshotPreviews =
    signal<string[]>([]);

  // Authenticated screenshot data URLs
  //
  // IMPORTANT:
  // These are data:image/... URLs, NOT blob:http://... URLs.
  screenshotUrls =
    signal<Record<number, string>>({});


  // =========================================
  // UI STATE
  // =========================================

  loading = signal(false);

  saving = signal(false);


  // =========================================
  // CONSTRUCTOR
  // =========================================

  constructor(
    @Inject(MAT_DIALOG_DATA)
    public readonly data: TradeEvaluationDialogData,

    private readonly dialogRef:
    MatDialogRef<TradeEvaluationDialog>
  ) {}


  // =========================================
  // INIT
  // =========================================

  ngOnInit(): void {
    this.loadEvaluation();
  }


  // =========================================
  // LOAD EVALUATION
  // =========================================

  private loadEvaluation(): void {

    this.loading.set(true);

    this.tradesService
      .getTradeEvaluation(
        this.data.trade.ibExecID
      )
      .subscribe({

        next: (evaluation) => {

          this.positivePoints.set(
            [...(evaluation.positivePoints ?? [])]
          );

          this.negativePoints.set(
            [...(evaluation.negativePoints ?? [])]
          );

          this.comment.set(
            evaluation.comment ?? ''
          );


          const savedScreenshots =
            [...(evaluation.screenshots ?? [])];

          this.screenshots.set(
            savedScreenshots
          );


          this.loading.set(false);


          // Load every saved screenshot through
          // Angular HttpClient so authentication
          // interceptors are applied.
          for (const screenshot of savedScreenshots) {
          console.log("eee " + JSON.stringify(screenshot.filename))
            if (screenshot.id) {

              this.loadScreenshotImage(
                screenshot.id,
                screenshot.contentType
              );
            }
          }
        },

        error: (error) => {

          this.loading.set(false);

          if (error.status === 404) {

            this.positivePoints.set([]);
            this.negativePoints.set([]);
            this.comment.set('');
            this.screenshots.set([]);

            return;
          }

          console.error(
            'Failed to load trade evaluation:',
            error
          );
        }
      });
  }


  // =========================================
  // LOAD SAVED SCREENSHOT
  // =========================================

  private loadScreenshotImage(
    screenshotId: number,
    contentType?: string
  ): void {

    this.tradesService
      .getTradeEvaluationScreenshot(
        this.data.trade.ibExecID,
        screenshotId
      )
      .subscribe({

        next: (blob) => {

          console.log(
            'Screenshot loaded:',
            {
              screenshotId,
              blobType: blob.type,
              blobSize: blob.size,
              expectedType: contentType
            }
          );


          if (!blob || blob.size === 0) {

            console.error(
              'Screenshot response is empty:',
              screenshotId
            );

            return;
          }


          // If the backend/gateway does not preserve
          // the image content type, create a new Blob
          // using the type stored with the screenshot.
          let imageBlob = blob;


          if (
            !blob.type.startsWith('image/') &&
            contentType?.startsWith('image/')
          ) {

            imageBlob =
              new Blob(
                [blob],
                {
                  type: contentType
                }
              );
          }


          const reader =
            new FileReader();


          reader.onload = () => {

            const dataUrl =
              reader.result as string;


            if (
              !dataUrl ||
              !dataUrl.startsWith('data:')
            ) {

              console.error(
                'Invalid screenshot data URL:',
                screenshotId
              );

              return;
            }


            this.screenshotUrls.update(
              urls => ({
                ...urls,
                [screenshotId]: dataUrl
              })
            );
          };


          reader.onerror = (error) => {

            console.error(
              'Failed to convert screenshot to data URL:',
              screenshotId,
              error
            );
          };


          reader.readAsDataURL(imageBlob);
        },

        error: (error) => {

          console.error(
            'Failed to load screenshot:',
            screenshotId,
            error
          );
        }
      });
  }


  // =========================================
  // POSITIVE POINTS
  // =========================================

  addPositivePoint(): void {

    this.positivePoints.update(
      points => [
        ...points,
        ''
      ]
    );
  }


  updatePositivePoint(
    index: number,
    value: string
  ): void {

    this.positivePoints.update(points => {

      const updated = [...points];

      updated[index] = value;

      return updated;
    });
  }


  removePositivePoint(
    index: number
  ): void {

    this.positivePoints.update(
      points =>
        points.filter(
          (_, i) => i !== index
        )
    );
  }


  // =========================================
  // NEGATIVE POINTS
  // =========================================

  addNegativePoint(): void {

    this.negativePoints.update(
      points => [
        ...points,
        ''
      ]
    );
  }


  updateNegativePoint(
    index: number,
    value: string
  ): void {

    this.negativePoints.update(points => {

      const updated = [...points];

      updated[index] = value;

      return updated;
    });
  }


  removeNegativePoint(
    index: number
  ): void {

    this.negativePoints.update(
      points =>
        points.filter(
          (_, i) => i !== index
        )
    );
  }


  // =========================================
  // SCREENSHOT SELECTION
  // =========================================

  onScreenshotSelected(
    event: Event
  ): void {

    const input =
      event.target as HTMLInputElement;


    if (
      !input.files ||
      input.files.length === 0
    ) {
      return;
    }


    const files =
      Array
        .from(input.files)
        .filter(file =>
          file.type.startsWith('image/')
        );


    if (files.length === 0) {

      console.error(
        'No valid image files selected'
      );

      input.value = '';

      return;
    }


    // Store files for upload
    this.screenshotsToUpload.update(
      current => [
        ...current,
        ...files
      ]
    );


    // Create previews
    for (const file of files) {

      const reader =
        new FileReader();


      reader.onload = () => {

        this.screenshotPreviews.update(
          previews => [
            ...previews,
            reader.result as string
          ]
        );
      };


      reader.onerror = (error) => {

        console.error(
          'Failed to create screenshot preview:',
          file.name,
          error
        );
      };


      reader.readAsDataURL(file);
    }


    // Allow selecting the same file again
    input.value = '';
  }


  // =========================================
  // REMOVE NEW SCREENSHOT
  // =========================================

  removeScreenshot(
    index: number
  ): void {

    this.screenshotsToUpload.update(
      files =>
        files.filter(
          (_, i) => i !== index
        )
    );


    this.screenshotPreviews.update(
      previews =>
        previews.filter(
          (_, i) => i !== index
        )
    );
  }


  // =========================================
  // GET SAVED SCREENSHOT URL
  // =========================================

  getScreenshotUrl(
    screenshot: TradeEvaluationScreenshot
  ): string {

    if (!screenshot.id) {
      return '';
    }


    return this.screenshotUrls()[
      screenshot.id
      ] ?? '';
  }


  // =========================================
  // OPEN SCREENSHOT
  // =========================================

  openScreenshot(
    screenshot: TradeEvaluationScreenshot
  ): void {

    if (!screenshot.id) {
      return;
    }


    const imageUrl =
      this.screenshotUrls()[
        screenshot.id
        ];


    if (!imageUrl) {

      console.warn(
        'Screenshot is not loaded yet:',
        screenshot.id
      );

      return;
    }


    // Open blank tab first.
    // Do NOT open the backend URL directly,
    // because that would produce a 401.
    const newWindow =
      window.open('', '_blank');


    if (!newWindow) {

      console.error(
        'Browser blocked the new tab'
      );

      return;
    }


    newWindow.document.title =
      screenshot.filename ?? 'Screenshot';


    newWindow.document.body.style.margin =
      '0';

    newWindow.document.body.style.background =
      '#111';

    newWindow.document.body.style.display =
      'flex';

    newWindow.document.body.style.alignItems =
      'center';

    newWindow.document.body.style.justifyContent =
      'center';


    const image =
      newWindow.document.createElement('img');


    image.src = imageUrl;

    image.alt =
      screenshot.filename ?? 'Trade screenshot';

    image.style.maxWidth =
      '100vw';

    image.style.maxHeight =
      '100vh';

    image.style.objectFit =
      'contain';


    newWindow.document.body.appendChild(
      image
    );
  }


  // =========================================
  // DELETE SAVED SCREENSHOT
  // =========================================

  deleteSavedScreenshot(
    screenshot: TradeEvaluationScreenshot
  ): void {

    if (!screenshot.id) {
      return;
    }


    this.tradesService
      .deleteTradeEvaluationScreenshot(
        this.data.trade.ibExecID,
        screenshot.id
      )
      .subscribe({

        next: () => {

          const id =
            screenshot.id!;


          this.screenshots.update(
            items =>
              items.filter(
                item =>
                  item.id !== id
              )
          );


          this.screenshotUrls.update(
            urls => {

              const updated =
                { ...urls };

              delete updated[id];

              return updated;
            }
          );
        },

        error: (error) => {

          console.error(
            'Failed to delete screenshot:',
            error
          );
        }
      });
  }


  // =========================================
  // SAVE
  // =========================================

  save(): void {

    if (this.saving()) {
      return;
    }


    const positivePoints =
      this.positivePoints()
        .map(point => point.trim())
        .filter(
          point =>
            point.length > 0
        );


    const negativePoints =
      this.negativePoints()
        .map(point => point.trim())
        .filter(
          point =>
            point.length > 0
        );


    const request:
      TradeEvaluationRequest = {

      positivePoints,

      negativePoints,

      comment:
        this.comment().trim()
    };


    this.saving.set(true);


    this.tradesService
      .saveTradeEvaluation(
        this.data.trade.ibExecID,
        request
      )
      .subscribe({

        next: (evaluation) => {

          console.log(
            'Evaluation saved:',
            evaluation
          );


          const files =
            this.screenshotsToUpload();


          if (files.length === 0) {

            this.saving.set(false);

            this.dialogRef.close(true);

            return;
          }


          const uploads =
            files.map(
              file =>
                this.tradesService
                  .uploadTradeEvaluationScreenshot(
                    this.data.trade.ibExecID,
                    file
                  )
            );


          forkJoin(uploads)
            .subscribe({

              next: (
                uploadedScreenshots
              ) => {

                console.log(
                  'Screenshots uploaded:',
                  uploadedScreenshots
                );


                this.screenshots.update(
                  current => [
                    ...current,
                    ...uploadedScreenshots
                  ]
                );


                this.screenshotsToUpload.set(
                  []
                );


                this.screenshotPreviews.set(
                  []
                );


                this.saving.set(false);

                this.dialogRef.close(true);
              },

              error: (error) => {

                console.error(
                  'Screenshot upload failed:',
                  error
                );

                this.saving.set(false);

                this.dialogRef.close(true);
              }
            });
        },

        error: (error) => {

          this.saving.set(false);

          console.error(
            'Failed to save evaluation:',
            error
          );
        }
      });
  }


  // =========================================
  // CANCEL
  // =========================================

  cancel(): void {

    this.dialogRef.close(false);
  }
}
