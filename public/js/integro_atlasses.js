(function IntegroAtlasses () {
  const BASE_URL = 'https://stratang-backend.integ.ro';
  const BASE_API_URL = BASE_URL + '/api';

  const ALL_API_URL = {
    'authenticate:POST': {
      url: `${BASE_API_URL}/authenticate`,
      method: 'post',
      useToken: false
    },
    'atlasses:GET': {
      url: `${BASE_API_URL}/atlas`,
      method: 'get',
      useToken: true
    }
  };

  window.onload = function () {
    function $a () {
      return new $atlasses();
    }
    const $atlasses = function () {
      this.arrayDom = document.querySelectorAll('[data-integro-atlasses="true"]');
      this._init();
    };
    $atlasses.prototype._init = function (){
      const self = this;
      this._authenticate();
      (this.arrayDom).forEach(function (elementDom){ self._loadPdf(elementDom); });
    };

    $atlasses.prototype._authenticate = function (){
      let userToken = localStorage.getItem('userToken');
      const password='!"·$%&';
      const username='nystrom_maps_system';
      const rememberMe=true;

      if (userToken && userToken !== '') {
        this._fetch('atlasses:GET', '', (response)=>{
          console.log('resposne attlases', response);
        });
        return;
      }
      this._fetch('authenticate:POST', { password: password, username: username, rememberMe: true }, (response)=>{
        localStorage.setItem('userToken', response.id_token);

        this._fetch('atlasses:GET', '', ()=>{

        });
      });

    };

    $atlasses.prototype._fetch = function (api, data, callback){
      let url = ALL_API_URL[api].url;
      const method = ALL_API_URL[api].method;
      const useToken = ALL_API_URL[api].useToken;

      const paramsAjax = {
        url: url,
        type: method,
        dataType: 'json',
        contentType: 'application/json',
        success: function (response){ callback(response); }
      };

      if (method !== 'get') paramsAjax.data = JSON.stringify(data);
      else url += data;

      if (useToken) {
        const token = localStorage.getItem('userToken');
        if (token && token !== '') paramsAjax.headers = { Authorization: 'Bearer ' + token };
      }

      $.ajax(paramsAjax);
    };

    $atlasses.prototype._loadPdf = function (elementDom) {
      const idParent = elementDom.id;
      const keyAtlasses = elementDom.getAttribute('data-key-atlas');
      const nameAtlasses = elementDom.getAttribute('data-name-atlas');
      if (!idParent || idParent === '' || !keyAtlasses || keyAtlasses === '' || !nameAtlasses || nameAtlasses === '') return; // div without id, key and name atlas
      const idViewer = idParent + '-viewer';

      elementDom.insertAdjacentHTML(
        'beforeend',
        '<div id="' + idViewer + '" class="flowpaper_viewer" style="position:absolute; width:100%; height:100%; background-color:#222222;"></div>'
      );

      $('#' + idViewer + '').FlowPaperViewer({
        config : {
          PDFFile                 : 'atlasses/' + nameAtlasses + '/' + nameAtlasses + '.pdf?reload=',
          IMGFiles                : 'atlasses/' + nameAtlasses + '/' + nameAtlasses + '.pdf_{page}.jpg?reload=',
          HighResIMGFiles         : '',
          JSONFile                : 'atlasses/' + nameAtlasses + '/' + nameAtlasses + '.pdf_{page}.bin?reload=',
          JSONDataType            : 'lz',
          ThumbIMGFiles           : 'atlasses/' + nameAtlasses + '/' + nameAtlasses + '.pdf_{page}_thumb.jpg?reload=',
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

          UIConfig                : 'atlasses/' + nameAtlasses + '/UI_Zine.xml?reload=',
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