(function IntegroAtlases () {
  window.onload = function () {
    function $a () {
      return new $atlase();
    }
    const $atlase = function () {
      this.arrayDom = document.querySelectorAll('[data-integro-atlas="true"]');
      this._init();
    };
    $atlase.prototype._init = function (){
      const self = this;
      (this.arrayDom).forEach(function (elementDom){ self._loadPdf(elementDom); });
    };

    $atlase.prototype._loadPdf = function (elementDom) {
      const idParent = elementDom.id;
      const keyAtlase = elementDom.getAttribute('data-key-atlase');
      const nameAtlase = elementDom.getAttribute('data-name-atlase');

      if (!idParent || idParent === '' || !keyAtlase || keyAtlase === '' || !nameAtlase || nameAtlase === '') return; // div without id, key and name atlase
      const idViewer = idParent + '-viewer';

      elementDom.insertAdjacentHTML(
        'beforeend',
        '<div id="' + idViewer + '" class="flowpaper_viewer" style="position:absolute; width:100%; height:100%; background-color:#222222;"></div>'
      );
      $('#' + idViewer + '').FlowPaperViewer({
        config : {
          PDFFile                 : 'atlases/' + nameAtlase + '/' + nameAtlase + '.pdf?reload=' + keyAtlase,
          IMGFiles                : 'atlases/' + nameAtlase + '/' + nameAtlase + '.pdf_{page}.jpg?reload=' + keyAtlase,
          HighResIMGFiles         : '',
          JSONFile                : 'atlases/' + nameAtlase + '/' + nameAtlase + '.pdf_{page}.bin?reload=' + keyAtlase,
          JSONDataType            : 'lz',
          ThumbIMGFiles           : false,
          SWFFile                 : '',
          FontsToLoad             : [
            'g_font_1',
            'g_font_2',
            'g_font_3',
            'g_font_4',
            'g_font_5',
            'g_font_6',
            'g_font_7',
            'g_font_8',
            'g_font_9',
            'g_font_10',
            'g_font_11',
            'g_font_12',
            'g_font_13',
            'g_font_14',
            'g_font_15',
            'g_font_16'
          ],
          Scale                   : 0.1,
          ZoomTransition          : 'easeOut',
          ZoomTime                : 0.4,
          ZoomInterval            : 0.1,
          FitPageOnLoad           : true,
          FitWidthOnLoad          : false,
          AutoAdjustPrintSize     : true,
          PrintPaperAsBitmap      : false,
          AutoDetectLinks         : true,
          ImprovedAccessibility   : false,
          FullScreenAsMaxWindow   : false,
          ProgressiveLoading      : false,
          MinZoomSize             : 0.1,
          MaxZoomSize             : 10,
          SearchMatchAll          : true,
          InitViewMode            : 'Zine',
          RTLMode                 : false,
          RenderingOrder          : 'html,html',
          StartAtPage             : 1,
          EnableWebGL             : false,
          PreviewMode             : '',
          PublicationTitle        : '',
          LinkTarget              : 'New window',
          MixedMode               : true,

          UIConfig                : 'UI_Zine.xml?reload=1552572834989',
          BrandingLogo            : '',
          BrandingUrl             : '',

          WMode                   : 'transparent',

          key                     : '',
          TrackingNumber          : '',
          localeDirectory         : 'locale/',
          localeChain             : 'en_US'
        }
      });
    };
    $a();
  };
})();