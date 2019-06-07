(function IntegroAtlas () {
  const BASE_URL = 'https://stratang-backend.integ.ro';
  const BASE_API_URL = BASE_URL + '/api';

  const ALL_API_URL = {
    'authenticate:POST': {
      url: `${BASE_API_URL}/authenticate`,
      method: 'post',
      useToken: false
    },
    'atlases:GET': {
      url: `${BASE_API_URL}/atlas`,
      method: 'get',
      useToken: true
    }
  };

  let atlasId;
  let userToken;

  function $a () {
    return new $classAtlas();
  }
  const $classAtlas = function () {
    this.elementDom = document.querySelector('[data-integro-atlases="true"]');
    this._init();
  };

  $classAtlas.prototype._init = function (){
    this._captureUrlParams();
    this._authenticate();
  };
  $classAtlas.prototype._authenticate = function (){

    const self= this;
    const username= 'admin';
    const password= '1ntegro2019';
    const rememberMe= true;

    if (userToken && userToken !== '') return this._fetchAtlases();

    this._fetch('authenticate:POST', { password: password, username: username, rememberMe: rememberMe }, function (response){
      if (response.id_token){
        userToken= response.id_token;
        self._fetchAtlases();
      }
    });
  };

  $classAtlas.prototype._fetchAtlases = function (){
    const self = this;
    this._fetch('atlases:GET', '?sort=id', function (arrayAtlas){
      let idViewAtlas = 1;
      // console.log('response atlas', atlas);

      if (atlasId) {
        idViewAtlas = atlasId;
        arrayAtlas.forEach((atlas)=>{
          if(atlas.id * 1 === idViewAtlas * 1) self._loadPdf (atlas);
        });
      }
    });
  };

  $classAtlas.prototype._fetch = function (api, data, callback){
    const url = ALL_API_URL[api].url;
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
    else paramsAjax.url += data;

    if (useToken && userToken && userToken !== '') paramsAjax.headers = { Authorization: 'Bearer ' + userToken };

    $.ajax(paramsAjax);
  };

  $classAtlas.prototype._captureUrlParams = function () {
    const urlString = window.location.href;
    const urlFormat = new URL(urlString);
    const key = urlFormat.searchParams.get('key');
    let atlas = urlFormat.searchParams.get('atlas');
    if (atlas && atlas !== '') atlas = atlas.replace(/[^\d]/g, '');

    atlasId = atlas;
    userToken = key;
  };

  $classAtlas.prototype._loadPdf = function (dataAtlas) {
    const idParent = this.elementDom.id;
    const uriAtlases = dataAtlas.uri;
    const keyAtlases = dataAtlas.key;
    const nameAtlases = dataAtlas.name;
    const keyReloadAtlases = dataAtlas.keyReload;

    const InitViewMode = nameAtlases === 'NYS3505_AtlasGigante_Digital_v2-5'? 'Flip-SinglePage': 'Zine';

    if (!idParent || idParent === '' || !keyAtlases || keyAtlases === '' || !nameAtlases || nameAtlases === '') return; // div without id, key and name atlas

    $('#' + idParent).FlowPaperViewer({
      config : {
        InitViewMode: InitViewMode,

        PDFFile                 : uriAtlases + nameAtlases + '_[*,2].pdf?reload=' + keyReloadAtlases,
        IMGFiles                : uriAtlases + nameAtlases + '.pdf_{page}.jpg?reload=' + keyReloadAtlases,
        HighResIMGFiles         : '',
        JSONFile                : uriAtlases + nameAtlases + '.pdf_{page}.bin?reload=' + keyReloadAtlases,
        JSONDataType            : 'lz',
        ThumbIMGFiles           : uriAtlases + nameAtlases + '.pdf_{page}_thumb.jpg?reload=' + keyReloadAtlases,
        SWFFile                 : '',
        FontsToLoad             : null,

        Scale                   : 0.1,
        ZoomTransition          : 'easeOut',
        ZoomTime                : 0.4,
        ZoomInterval            : 0.1,
        FitPageOnLoad           : true,
        FitWidthOnLoad          : false,
        AutoAdjustPrintSize     : true,
        PrintPaperAsBitmap      : false,
        AutoDetectLinks         : false,
        ImprovedAccessibility   : false,
        FullScreenAsMaxWindow   : false,
        ProgressiveLoading      : false,
        MinZoomSize             : 0.1,
        MaxZoomSize             : 10,
        SearchMatchAll          : true,
        RTLMode                 : false,
        RenderingOrder          : 'html5,html',
        StartAtPage             : 1,
        EnableWebGL             : false,
        PreviewMode             : '',
        PublicationTitle        : '',
        LinkTarget              : 'New window',
        MixedMode               : true,

        UIConfig                : uriAtlases + 'UI_Zine.xml?reload=' + keyReloadAtlases,
        BrandingLogo            : '',
        BrandingUrl             : '',

        WMode                   : 'transparent',

        key                     : keyAtlases,
        TrackingNumber          : '',
        localeDirectory         : 'locale/',
        localeChain             : 'en_US'
      }
    });
  };
  $a();
})();