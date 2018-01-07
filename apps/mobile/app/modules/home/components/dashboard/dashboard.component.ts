import {
  Component,
  AfterViewInit,
  OnInit,
  NgZone,
  ViewChild,
  ElementRef,
  ViewContainerRef,
  OnDestroy
} from '@angular/core';

// libs
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs/Observable';
import { Subscription } from 'rxjs/Subscription';
import { SystemUser } from '@ngatl/api';
import { BaseComponent, UserActions, LogService, ModalActions, WindowService, ProgressService, UserState, IAppState } from '@ngatl/core';

// nativescript
import { BarcodeScanner } from 'nativescript-barcodescanner';
import * as app from 'tns-core-modules/application';
import { Page } from 'tns-core-modules/ui/page';
import { GestureTypes, SwipeGestureEventData } from 'tns-core-modules/ui/gestures';
import { AnimationCurve } from 'tns-core-modules/ui/enums';
import { View } from 'tns-core-modules/ui/core/view';
import { Animation, AnimationDefinition } from 'tns-core-modules/ui/animation';
import { screen, isIOS, isAndroid } from 'tns-core-modules/platform';

// app
import { IConferenceAppState } from '../../../ngrx';
import { NSAppService } from '../../../core/services/ns-app.service';
import { BarcodeComponent } from '../../../shared/components/barcode/barcode.component';

@Component({
  moduleId: module.id,
  selector: 'ngatl-ns-dashboard',
  templateUrl: 'dashboard.component.html'
})
export class DashboardComponent extends BaseComponent implements AfterViewInit, OnInit, OnDestroy {
  public user: any;
  public showIntro = false;
  public swipeEnable = true;
  public showSwiper = false;
  public showScans = false;
  public fontSize = 15;
  public scans: Array<UserState.IRegisteredUser> = [];
  private _barcode: BarcodeScanner;
  private _spinnerOn = false;
  private _beaconView: View;
  private _beaconAnime: Animation;
  private _stopAnime: () => void;
  private _restartAnime: () => void;
  private _swipeHandler: (args: SwipeGestureEventData) => void;

  constructor(
    private _store: Store<any>,
    private _log: LogService,
    private _ngZone: NgZone,
    private _vcRef: ViewContainerRef,
    private _win: WindowService,
    private _progressService: ProgressService,
    private _page: Page,
    public appService: NSAppService,
  ) {
    super();
    this._page.backgroundImage = 'res://home-bg';
    this.appService.currentVcRef = this._vcRef;
    this._stopAnime = this._stopAnimeFn.bind(this);
    this._restartAnime = this._restartAnimeFn.bind(this);
    this._swipeHandler = this._swipeHandlerFn.bind(this);

    // test
    this.scans = [
      {
        ticket_full_name: 'Mike Ryan'
      }
    ];
  }

  public openItem(item) {

  }

  public onItemTap(e) {
    if (e && isAndroid) {
      // android does not respond to tap events on items so use this
      // const persoItem = this.activeItems[e.index];
      // if (persoItem) {
      //   this.viewDetail(persoItem);
      // }
    }
  }

  public onSwipeCellStarted(args: any) {
    // if (!this._density) {
    //   this._density = 0;
    // }
    // const delta = Math.floor(this._density) !== this._density ? 1.1 : .1;
    // let right = this.isKids ? 0 : Math.round(this._density * 100);
    // let threshold = this.isKids ? 0 : Math.round(this._density * 50);
    // if (args) {
    //   if (typeof args.index === 'number' && args.index > -1 && this.activeItems && this.activeItems.length) {
    //     this._swipeItemIndex = args.index;
    //     const persoItem = this.activeItems[args.index];
    //     if (persoItem) {
    //       // if item is flattening, do not allow swipe
    //       const isFlattening = (<any>persoItem).showGears;
    //       if (isFlattening) {
    //         // disable swipe
    //         right = threshold = 0;
    //       }
    //     }
    //   } else {
    //     // no valid item index
    //     // disable swipe
    //     right = threshold = 0;
    //   }
    //   if (args.data && args.data.swipeLimits) {
    //     const swipeLimits = args.data.swipeLimits;
    //     swipeLimits.top = 0;
    //     swipeLimits.bottom = 0;
    //     swipeLimits.left = 0;//Math.round(this._density * 100);
    //     // if kids, don't allow swipe right
    //     swipeLimits.right = right;
    //     swipeLimits.threshold = threshold;
    //   }
    // }
  }

  public onSwipeCellFinished(args: any) {
    // if (args && typeof args.index === 'number' && args.index > -1) {
    //   this._swipeItemIndex = args.index;
    // }
  }

  public remove(e) {
    // if (this._swipeItemIndex > -1 && this.activeItems && this.activeItems.length) {
    //   const persoItem = this.activeItems[this._swipeItemIndex];
    //   if (persoItem) {
    //     const prefix = this.isVideo ? 'video' : 'call-info';
    //     const promptOptions: ConfirmOptions = {
    //       message: this._translate.instant(`${prefix}.delete-warning-txt`),
    //       okButtonText: this._translate.instant('general.yes-lbl'),
    //       cancelButtonText: this._translate.instant('general.no-lbl'),
    //     };

    //     (<any>this._win.confirm(<any>promptOptions)).then(
    //       result => {
    //         if (result) {
    //           this._store.dispatch(new PersoItemActions.DeleteAction(persoItem.id));
    //         }
    //       });
    //   }
    // } else {
    //   this.appService.showAlert(this._translate.instant('generic.error-lbl'));
    // }
  }

  public startBadge(e) {
    this._log.debug('startBadge:');
    this._log.debug(screen.mainScreen.widthDIPs + 'x' + screen.mainScreen.heightDIPs);
    this._initBeacon();
    this._showBadge();
  }

  private _initBeacon() {
    return new Promise((resolve) => {
      this._beaconView = <View>this._page.getViewById('beacon');
      if (this._beaconView) {
        this._beaconAnime = this._beaconView.createAnimation({
          translate: {
            x: (screen.mainScreen.widthDIPs/2) - 46,
            y: 260
          },
          scale: {
            x: .5,
            y: .5,
          },
          opacity:0,
          duration: 1,
          iterations: 1
        });
        this._beaconAnime.play().then(_ => {
          resolve();
        }, _ => {

        });
      }
    });
  }

  private _showBadge() {
    const top = <View>this._page.getViewById('badge-top');
    const bottom = <View>this._page.getViewById('badge-bottom');
    if (bottom && top) {
  
      bottom.animate({
        translate: {
          x: (screen.mainScreen.widthDIPs/2) - 275,
          y: -600
        },
        scale: {
          x: .6,
          y: .6,
        },
        rotate:3,
        duration: 1,
        iterations: 1,
      }).then(_ => {
        bottom.animate({
          translate: {
            x: (screen.mainScreen.widthDIPs/2) - 275,
            y: -80
          },
          scale: {
            x: .6,
            y: .6,
          },
          rotate: -8,
          duration: 800,
          iterations: 1,
          curve: AnimationCurve.easeIn// AnimationCurve.spring
        });
      }, _ => {

      });
  
      top.animate({
        translate: {
          x: (screen.mainScreen.widthDIPs/2) - 42,
          y: -600
        },
        scale: {
          x: .4,
          y: .4,
        },
        rotate: 0,
        duration: 1,
        iterations: 1,
      }).then(_ => {
        top.animate({
          translate: {
            x: (screen.mainScreen.widthDIPs/2) - 42,
            y: -180
          },
          scale: {
            x: .4,
            y: .4,
          },
          rotate: 18,
          duration: 800,
          iterations: 1,
          curve: AnimationCurve.easeIn,
        }).then(_ => {
          this._startBeacon();
        }, _ => {

        });
      }, _ => {

      });
    }
  }

  private _startBeacon() {
    app.on(app.suspendEvent, this._stopAnime);
    app.on(app.resumeEvent, this._restartAnime);
    this._playBeacon();
  }

  private _restartAnimeFn() {
    this._log.debug('_restartAnimeFn!');
    this._log.debug(this._beaconAnime);
    if (this._beaconAnime) {
      this._log.debug(this._beaconAnime.isPlaying);
      if (this._beaconAnime.isPlaying !== true) {
        this._initBeacon().then(_ => {
          this._startBeacon();
        });
      }
    }
  }

  private _stopAnimeFn() {
    this._log.debug('_stopAnimeFn!');
    this._log.debug(this._beaconAnime);
  }

  private _stopBeacon() {
    if (this._beaconAnime) {
      // this._log.debug(this._beaconAnime.isPlaying);
      if (this._beaconAnime.isPlaying === true) {
        this._beaconAnime.cancel();
      }
    }
  }

  private _playBeacon(delay: number = 1000) {
    if (this._page) {
      if (this._beaconView) {
        this._beaconAnime = this._beaconView.createAnimation({
          translate: {
            x: (screen.mainScreen.widthDIPs/2) - 46,
            y: 260
          },
          scale: {
            x: .5,
            y: .5,
          },
          opacity:0,
          duration: 1,
          iterations: 1
        });
        this._beaconAnime.play().then(_ => {
          this._beaconAnime = this._beaconView.createAnimation({
            translate: {
              x: (screen.mainScreen.widthDIPs/2) - 46,
              y: 260
            },
            scale: {
              x: 1.5,
              y: 1.5,
            },
            delay,
            opacity:.8,
            duration: 500,
            iterations: 1,
            curve: AnimationCurve.easeIn
          });
          this._beaconAnime.play().then(_ => {
            this._beaconAnime = this._beaconView.createAnimation({
              translate: {
                x: (screen.mainScreen.widthDIPs/2) - 46,
                y: 260
              },
              scale: {
                x: 3,
                y: 3,
              },
              opacity:0,
              duration: 500,
              iterations: 1,
              curve: AnimationCurve.easeOut
            });
            this._beaconAnime.play().then(_ => {
              this._playBeacon(800);
            }, _ => {

            });
          }, _ => {

          });
        }, _ => {

        });
        // beacon.animate().then(_ => {
        //   beacon.animate().then(_ => {
        //     beacon.animate().then(_ => {
        //       this._playBeacon(800);
        //     }, _ => {

        //     });
        //   }, _ => {

        //   });
        // }, _ => {

        // });
      }
    }
  }

  private _retractBadge() {
    const top = <View>this._page.getViewById('badge-top');
    const bottom = <View>this._page.getViewById('badge-bottom');
    if (bottom && top) {
  
      bottom.animate({
        translate: {
          x: (screen.mainScreen.widthDIPs/2) - 275,
          y: -600
        },
        scale: {
          x: .6,
          y: .6,
        },
        opacity:0,
        rotate:0,
        duration: 600,
        iterations: 1,
      }).then(_ => {
        this._ngZone.run(() => {
          this.showScans = true;
        });
      }, _ => {

      });
  
      top.animate({
        translate: {
          x: (screen.mainScreen.widthDIPs/2) - 42,
          y: -600
        },
        scale: {
          x: .4,
          y: .4,
        },
        rotate: 0,
        duration: 600,
        iterations: 1,
      }).then(_ => {

      }, _ => {

      });
    }
  }

  public openBarcode() {
    this._barcode = new BarcodeScanner();
    this._openScanner();
  }

  public toggleSpinner() {
    this._spinnerOn = !this._spinnerOn;
    this._progressService.toggleSpinner( this._spinnerOn );
    this._win.setTimeout( _ => {
      this._spinnerOn = false;
      this._progressService.toggleSpinner( false );
    }, 800 );
  }

  public login() {
    this._store.dispatch(new UserActions.LoginAction(this.user));
  }

  public create() {
    // this._store.dispatch(new UserActions.CreateAction(this.user));
    const user = new SystemUser( this.user );
    for ( const key in user ) {
      this._log.debug( key, user[key] );
    }
    this._store.dispatch(new UserActions.CreateFinishAction(user));
  }

  public enter() {
    ['intro-background', 'intro-logo-n', 'intro-logo-ng', 'intro-logo-atl', 'intro-text-one', 'intro-text-two', 'intro-version', 'intro-swipe'].forEach(id => { //'intro-logo-bg', 
      const p = this._page.getViewById(id);
      if (p) {
        p.className = id + '-enter';
      }
    });

    this._win.setTimeout(_ => {
      this._ngZone.run(() => {
        this.appService.shownIntro = this.showIntro = true;
      });
    }, 1500);
  }

  // public showIntroTest() {
  //   this.appService.shownIntro = this.showIntro = false;
  //   ['intro-background', 'intro-logo-n', 'intro-logo-ng', 'intro-logo-atl', 'intro-text-one', 'intro-text-two', 'intro-version', 'intro-swipe'].forEach(id => { //'intro-logo-bg', 
  //     const p = this._page.getViewById(id);
  //     if (p) {
  //       p.className = id + '-intro';
  //     }
  //   });
  //   this._setupSwipe();
  // }

  ngOnInit() {
    this.user = {
      firstName: 'Any',
      lastName: 'User',
      username: 'user@ngatl.org',
      email: 'user@ngatl.org',
      password: '12341234'
    };
    // this._store.select((s: IAppState) => s.user)
    //   .takeUntil(this.destroy$)
    //   .subscribe((s: UserState.IState) => {
    //     if (s.scanned) {
    //       this.scans = [...s.scanned];
    //     }
    //   });
    if (!this.appService.shownIntro) {
      this.showSwiper = true;
    }
  }

  ngAfterViewInit() {
    this._setupSwipe();
  }

  public retractTest() {
    this._stopBeacon();
    this._retractBadge();
  }

  private _setupSwipe() {
    if (!this.appService.shownIntro) {
      // console.log('ngAfterViewInit...');

      this._win.setTimeout(_ => {

        const mainScreen = <View>this._page.getViewById('intro-elements'); 
        if (mainScreen) {
          mainScreen.on(GestureTypes.swipe, this._swipeHandler);
        }
      }, 5000);
    }
  }

  private _swipeHandlerFn(args: SwipeGestureEventData) {
    console.log('mainScreen swipe:', args.direction);
    if (args.direction) {
      this.enter();
      // also turn swipe off to prevent further swipes
      const mainScreen = <View>this._page.getViewById('intro-elements'); 
        if (mainScreen) {
          mainScreen.off(GestureTypes.swipe, this._swipeHandler);
        }
    }
  }

  ngOnDestroy() { 
    super.ngOnDestroy();
    app.off(app.suspendEvent, this._stopAnime);
    app.off(app.resumeEvent, this._restartAnime);
  }

  private _openScanner(requestPerm: boolean = true) {
    this._barcode.hasCameraPermission().then( ( granted: boolean ) => {
      this._log.debug( 'granted:', granted );
      if ( granted ) {
        this._barcode.available().then( ( avail: boolean ) => {
          this._log.debug( 'avail:', avail );
          if ( avail ) {
            this._barcode.scan( {
              formats: 'QR_CODE,PDF_417,EAN_13',   // Pass in of you want to restrict scanning to certain types
              // cancelLabel: 'EXIT. Also, try the volume buttons!', // iOS only, default 'Close'
              cancelLabel: 'Cancel',
              cancelLabelBackgroundColor: '#000', // iOS only, default '#000000' (black)
              message: 'Use the volume buttons for extra light', // Android only, default is 'Place a barcode inside the viewfinder rectangle to scan it.'
              showFlipCameraButton: true,   // default false
              preferFrontCamera: false,     // default false
              showTorchButton: true,        // default false
              beepOnScan: true,             // Play or Suppress beep on scan (default true)
              torchOn: false,               // launch with the flashlight on (default false)
              closeCallback: () => {
                this._log.debug( 'Scanner closed' );
                this._barcode = null;
              }, // invoked when the scanner was closed (success or abort)
              resultDisplayDuration: 500,   // Android only, default 1500 (ms), set to 0 to disable echoing the scanned text
              orientation: 'portrait',     // Android only, optionally lock the orientation to either 'portrait' or 'landscape'
              openSettingsIfPermissionWasPreviouslyDenied: true // On iOS you can send the user to the settings app if access was previously denied
            } ).then( ( result ) => {
              this._log.debug( 'result:', result );
              if ( result ) {
                this._log.debug( 'Scan format: ' + result.format );
                this._log.debug( 'Scan text:   ' + result.text );
                for ( const key in result) {
                  this._log.debug( key, result[key] );
                }
                this._ngZone.run(() => {
                  if (result.text) {
                    const badgeGuid = result.text.split('/').slice(-1)[0];
                    this._store.dispatch(new UserActions.FindUserAction({ badgeGuid }));
                  }
                });
              }
            }, ( err ) => {
              this._log.debug( 'error:', err );
              this._restartAnimeFn();
            } );
          }
        } );
      } else if (requestPerm) {
        this._barcode.requestCameraPermission().then( () => {
          this._openScanner(false); // prevent loop on
        } );
      } else {
        //this._win.alert( 'Please enable camera permissions in your device settings.' );
      }
    } );
  }
}
