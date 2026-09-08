import axios from "axios";
import { ENV } from "../config/env.js";
import { findGerenteEmailsByGerencia } from "./consultores.js";

/* ─── Logo em base64 ────────────────────────────────────────────────────── */

// LogoTegra.png (admin/public/) - versao branca do lockup completo,
// redimensionada pra 221x128 (2x o tamanho de exibicao, pra nitidez em
// retina) - o arquivo original (1214x704, 286KB) deixaria o e-mail
// grande demais e sujeito a corte pelo Gmail (~102KB). Embutida direto
// no codigo pelo mesmo motivo do logoCorp.png (container sem admin/).
const LOGO_DATA_URI =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAN0AAACACAYAAACP1GwzAABDgElEQVR42u29d5hlVZU+/K6197mxUjfVmYxIaAQEBlSyGEdR1OmeUWd0VMz6OYZRxzDVhXl+zDiOIw6jjohiKBwxICYUMyrgGBABRZI0TaequuHEvdf6/jjnVt26XVVdTRLkvs9TdHHr3BP22WuvtVd4F9BHH3300UcfffTRRx999NFHH3300UcfffTRRx999NFHH3300UcfffTRRx999NFHH3300UcfffTRRx999NFHH3300UcfffTRRx999NFHH3300UcfffTRRx999NFHH3300UcffdwTjKnyxMSEGRsb4/vrmhsmJsyGiQmjqtR/A308dIRtTLl30k/cx4IwprqLYE9MTBjcx8Knqqb3pz8D+rjfoKo0MTExM+ku+O41T/v0lde+6zNX/nb/OYJwL19zQ9c53/nFH7zw3Zf+6H1jE1es7tZ+/bfTxwMJ94YmoIkJ5Y0byQPAxy7/yeFcKr8VRM+p1QeQRu0tTPi3aGvzv84+66SmqtImgMaJ5J5dc4I3btzoAeA9l3zn2IztWFApnxkEJcTt9q3euX/Zflv4sQ++5i+T3MTdhPHxe3TNGUEnIt22TQeHRtwbIDIMwKuiQoRtpd/97t10xBFpf2r1cZ8I3cTEhOlM/I98/cfLg2r5NcL8mkq1NhyHbQVUykFgSuUy0ij+lWZu/G9PO/YLne9u2LBBiEj3dN92cXHNd/7v19ZwUHsTGfNSW65U4jAUqGpQKhlrAyRR9DPn/KaxZ572tc53J+7GNXuEjolIQtV9A+9vscbMjKGI38Fs9ieiVkc4+1Osj3tF6MbGxhibNmGcSCY2TJjwFfs/T619c7lWf3gaRfDeeyYYJoKqKkBSqlSMdx7OZV+Az97xgtNP+MWeCF/HITM+Pi7nn39+sG3d4S8A9K2Van3fNAqhIh5KpngiUUCDcsWkWQrvZEKz9F3jGx73q67FQgDoPRE66/3/BcYMC+AZMAJ/M8McTUTtvtD1ca8InarSxQBvpNyU/OjXf3i6rVX/uVSpnuZFkCWxB4iZiEBzp7SoCgCq1AcojcIWq3w43Rn9+9lnnbS5V2vucs2LL54xJd95yXeeCGveFpRrJ4nL4LLUE8BERJ1LauexVEUJVKnVKYmilnr/wfZ09q/vff7jd/RqzT0XunDfQEq/smyGPcQbsBHxN/P2HUfSqlV9TdfHPRe6bqH4xLeu3tcH+Cdi8+JytWLiMBSCAkRzvYgKEM1eRhVQqDdsTLVWQxq2/+jF/2s8vfm/X/q0p4U9+705+7Z3TVx2uCnX36rWPIdtCVkcCoEAAnddbiF4ZjZBpYo0bN+kou/+5UUf+sTFF1/sx1RzrT0+Lnuo6fYJvP+VNWakI3Te+5t37Nhx5Ko9FLouz27nX727Alucq/u96p9S+HufbVP+ow/lBYmWMmibNm2i8fFxufDCb9R1371epoZfX6rW1yTtFhTqCWQWPTnRrFQQoPmbkKAUmCAoIQzDnzsv7zj79OO+2HHFU6FNxz7y9eXBivLrrbWvKlfrQ1G7pVBRRSHgNEfGF3lMVQUkCEoGbJDFyfecS88Zf9YZ3+mEHXbn3NE8NGEASIRo78CXfmGNGQHgARgRuZmZjwbQ7ly08zPfJOuEGDrPOs+1CMCS9qCd4xc4lynuQbqv2zVsc+6v69raLbiFAHH39zpvgHrGbrFnuzvP95DUdOd/+8qnlYPyplq9/sgkSZCluVkHonnPMTOM1C14Wrym/HdRVRBJqVw14j3Eua/AyfjfP/bYazA2xu877nF/n6m+uVytHezSBOJdIeA6r5DpUh5VIaKKUrXOaRwpFJ9Cmr7rnzeecUPPRNvdJB/2IjcZ5r0g8GAYEbmFmQ/c3STqrP6d4/Tqq4P2oYeOGmNqSZKoqu5ctmzZVK923Z32zX+fMJOTj1tnba0mEqeTk5ObDzjggHgp51mK13apmq372EbjjlEJlg8TEVvvw61bt+7o3NM9va8/K6ErBhkfv+Knq4Tsf5gg2GCtQRrHHgoudm0Ln7izBs5zlHb9ooX8GWaUqjWWuN1av3r0Iz+/7a6Ddzo81YmHT1MPKBM6e0VdUNB0vj90K9rC2lHKtVOlWofPkilk7i1vfvopH154cik1w+S1xvKhmXOpZR4q22CDMVwRQBkgL9JKs+SzAEciYDDUe6lk3r1/dGjouo7p15lgWZY9kYGNSjjGi64BoaoKNYQdzHydKr5ijPkMETW7tf98AqdRdKBY+zIlPNZ7PYCYqqpImPQOMP009en59VL9Z6o6GsXR20XFMpiYeTj16ReG6kP/CwDaaq3JSnaTANY7DyaupGn6qeHh4a/l9++e7Jw8UZX28eqMIdtIJf3MQGXgsu57zLLsDEA2MJlHiupqgQ4TiBQaGeKtxpibvPeXGrPjc0SrWg8lwbML/eHiiy9mAD52esKy0eENYWNakiwBE5sl5XnMd4zOft4RSiaCiLJzDnux949cf/DA2pGB1/pSBTfcvllu3xFBVQ0z5UKquqi0z6uqimtR10aTAAMFkrCVVoeGRtrp1N8B+HCv4u4I4cTExWztWS+qBMHh1SDoOrUWp1YY5oFquXp27+WnmlNfB3AdAEtEWbut68oV+YBhflbnGDPXQB8GcCCAp3rxr07T9OVE9MNewetM1HbcPkuC4Hxms7LnXFUAIwDWE/i5kUtfD6Q/rlaq/9+cZ4x1O4D/BYDE2mXloPwSAEDxmE7cbY1G42oRuZDZPskWsyaYOYAiAJcRkVfVZU7cBy3b53bOz3NfxBCAVQAeYYw5y/m9Xt1O07OJ6OqHiuDZ3R2QqZo4Cn2+QjPfo+Be1xeJCF4VWeYwVC3hyH33xiFrRo1h1kYUSxpHdOCq5bx8oIabt01heysECDDEd8fT33MP3VJIxmeZOqX2Yl/buGGDJM5NAnB5RIJZIIbmrCWiAPteca+WSlnxzFmsejA7/xXD5hDAS26amqD3eiLiwIBhc4Qqvp5l8d8S0RdnNFvxb5Rlj7dEn2M2JYE4FmYwpNh7FiMu3jBKDPufzvmrrEUGgAXiGWystZPdr9yLbxk21U4opFwuH6+gS5n5ePHeIxd8YoYH2BhrIwCYnp7ey3n3JWvsiR5ODOABDmbFbsZPBA91AMMac5RCL02S5Awi+s1DQfDs7m10YSqcB/eG8dqxODPnEFiDQ/ZZiUfssxqDlTJUFapKqmoyL1ABBqolHL73CmxvRbh95xSaUQomAhNBO3vEJau8ufav5i4EKBHN5Gmqzjp+5hxPmkWJBhY2dd4boyb3nnbsbOoocKv5uMGLIDAWqYeBgianJofZuYnA2kO8+MywGrANvMgWhVwSZ/5GAg9UAnOGYT5NICqAs8bUReiTrSQ5iYh+qaoWgG80GisCov82xpSciGcm6yFqwBYAvMg2Vc1AusqyJYWotfYvZjUQA4Dxqr3GuAVgOJcWCkzwWAAQSMbGBIVAz+hCJ64MAJVa7Q3W2BMBxJQLW+DFh8ry5Szzv/ACFzCtN0zPsMaMOIg6IAuMXZVK+q+q+uR7tqL+mQgdCxFoz3Wbdiw5zPpOiADnctndf8UyHLXfGowO1jtxPBQbnvy7xbbKeQWYsGZkAKMDVdwx2cAdOxuIMwdjGERztniL3xAttLHMb2Fe2eza37Vc+ooolhWsJqpAV1imC0pEy5x4sWzYi2zZ3m6/jIRjY1TU2oyi2Drg1yDoQDbwOmvt0QJxhskAhjPvrvGZ21CtVm/uuuw7nerbDfgcySe4Y+YBBv6lmJggIk3T+AXGmP1FxBtmIyJqmCkVf7mIvsfb5Lo66lkG7J+JvDpgfj4A56GWMbspF5G5y9WuFrwUQho48ZNe9WZSpEwgNnYoTd21qho4719YHF9hMLxgW+rNM2qGftR9snaanq/A140xw4AYAGqMObXV2nn44OBef/babrdCJ8Uq2HGs6ILmZfeGbe56xUTwIsi8YOVQDUfttxYHrFjW2ZcAhebq9kpSEeTmQua99zBMOGDFMqwYrOPWbZPY0mjDC2ANza/kqEfAejyq1HGm5p6h3Yru6sHBX8/s01SXW+89ADCbzuWaq4eGvjTfd6emppYr8CIAymACQN77KPXJ2QPVgZuvvfba0vr16z0A2oRNYone4bx/tGF+shMQMcQa8/hms3ni0NDQD/JJ7v4KgDIzICKGmZ33P9xsbj/zADPrHQSwA8DfZ95vscxvUqgAszFV1dmQT5qmxMZQbtoIGKwASEQgcO/JEv9f11133Z3HHnusA0CbN2+urF27NgIwoKpfyUT2V9UBBkYEeFetZH+kqkHXyDMR/TTNsi8x8PyOQBs2lVKpeiSA39xLOcEPXqGD6Zm0tARbUudGCRLnUC8HOGb/tThs3UqUrAFUCw1Ii1qnRJ3Xkgu8c4JaKcBh61ZixVCIm7dPYSqMwUSwTHPkShfRenPlb2mRgk6c7uKLL5YyMMT5BnPWUcCgbdu2DY6OjoYA6GJAN+R/djHccQHs2rmi739UL9V/WUzKzl5QN2GT3aSbvAM+LIonA8IK9oExNguCpwH4QRzH+wWl4HAAJBBmZhURcZptOoAOiItzuq636AGc47xssIYPFIh08gpEnJkz7EQzTqLCXGUn7t/KQfkt86y0YfF7E8DZAHC1arDP1q3llStXtlXVElE2jwnx61yFskIAZsAYu/wh7b2cgUd3YtUeIXMCw4TD1q7AUfuuwWC1PKPdaE7MQWeEiubxecz5nAAv+bwdHaxhWb2KzZMN3L5jGlHmYJjnKlzd/XZzqc9WODCwceNGaas6CBQ81wgbHR31hRePNhLpFVdcQaeffrrGLv0LGEAArxAyYDinX7eWFEA276irXiOE0BLXOraWIToBADz5gytcqecjxAqAVeWGiq38qAhNuC7T2BWezzDz/jsADlSBSrFpKzTvPLY3KYM5837aZ/4/ikWHuxaIOSZ4V4A+63omp3pjOY5XrDWmvjez7q/KhyrwdM2DpoYBARgiS5iPD4k9nRYqaRHhmE+3qCpWDw/g2APWYc2ywbnCRjSPWTp71lwgCVLsO2g+1z8BInnAcP/RZVg1VMdtO6exeaoFX+wPdRElNveKirtT8Doj0DKj7mjLli1zznPaaadp7sY3e888goCVFSB6RhwnB3vViogoAwpiTwyFQLMsWxYEeXyCZxXqw/SKK2wkPFpIp3SuL6K/sZbihWKNqkqZ97/r8ePvagfo7NsvFr7N1Wp1a7HoLJrC1QlpTMfxw0tEJxumxzlPRwYB7W2MGZqzsqgiz9N9aGWE7VbovCpr4b0rQtmLuU7mJAgdd+A6rB4ZnOMkWYqrk3R2d5cLBu0acuj6b+YFpcDi4atH0U4dtjZDBMygBTJXOkH57iSZu+GYnVkPZmUOunr1ap1vYDiPvUEBYmIiFZRLpRMBnLgEW8OLiDKzElFp++rV1SFj7OyzzdzBjq7QmJ/PKZQ618zvn2eem+2cMMfMa+qyRPzu7O9C0EVVHyvAa1X8aYbNwKI7l8ID/VDj1tit0BGz5u51pSLBePeDVExmr7lbfnGBo4U/WmgPST1pL6TwXYHz3oVzF2VXiMucfR3dfVf17J6OdTM2L+CR6tJVxVRb4mQz+am5swgub8WxWTbP6ImX6u4z4oSLvIBdvJMzqTedESxkmQDcfvvttGiCNZGq13co8LZ8o2sAiC9+gfNeiPBHgG5TyO+gdKA15lQV1SL8C2bWvtABUBG6m4VA+V5wqS797oTo+SSMFhJTnat70NmD6kzYYlGfD+3GP7QAwjDU4UpF5kideF7La2m+qwmkyWAQoFKk2ESZvzzKsqvY6wAYhhmU7xNZCpe5AqJQqCgcMxvvsmiH9+19gKRLIosFEvuogph5sTzNA3tt4u5RKpVKij3Kac3T2lLVfwiAt1F+YgFgFWSc+EtUcZkT+XUtCK4H0CAyqupeDuDUIpDfuSPqC12RUkR3I1SnC76sRaY4dW2WdGHtqNTt7qcu5bWwupoR/l4na6H19iDTXQGgWqsJRHTXq8z/cF51s529BQFgLOPyverV992dF5dl2eYuRauFpjh0evq2ZSL7THVn/neSkBWgFHh0Lqy8q6beRchywZTdmJTNpq4U594CazuFwUaAVEEvLhl7Yc93rKrCw1dNcYkZI0CEHwpCx0syL1V3HzG4VwsbqNBACiXFTIUYzSRIzyNw6HHkdAkZza0wmqM8dd4A8e4lr92W3oC6AhVMTdmirMV0/ctG9ee5MoIxhWZS755YsIgF8zCLBYtdP7X2Ri+ys4ihEQCxNlhVLq84qxC2boYyS0TeZdljLdvji6fm+eZBkiRdfpSlzZ/KAI4pW7vCiSefbyXJe/myJbqwuAerOsMSR0TknMgRRcZTboV2aeyHvNBpJzi+p3puSXVuS9OT1CVEi+mjOY6wxWIC2ntfBN7DDIh2vd4ixlSeboVONHF1VCs/nog8Ebni35SIxFp7lYhsK1Z0AqDWBie0WpOHFy5202OyZUmYbIyS5LJmlFzSiNJPh5n/aDPLzgCAOtFmYr6mCI6LACSAGmvfPT09/RgiyorreyLKEtUjwPxfxGzmWT9n5kG5XJ51Y8kuhajz7xK9Xw1ALBsxyBMFnHdbuiO938V3OfedUBbH8eHE9AyBnyP8ThwDwHe/+116iOdeqirgGUSqeWXM7keEQPdEL1KX80MLtwPRLtpW54gNdazSXEN2G7O68NZOOzV2M1NstxuYwmtOLef978E4WFlUBGyYKTDB+e0keQRUr2JTDlX88szLHUT0Y+/95wG8HMy+CGjXgkr9vEaj8Qwi2t59nTjLzjRMnyixqXR/3kr127M+Rf9xGPP4jj9WQRpYu4rq9cujOL4E6q80hhVkjybv/yqvcvdKMNxtB4vMfVEzpjbPLmb77LPPwnPEuUkYw7nBkAfqmekZjUbjPCL67RwNnaaPYuYLDMyIiBcimnGj2l3ihQ/VPR0FUqnUTJhOq6oK0VwXEy2wWyOlxbdz88qkFs5sgi/yjru3eYT5c5GhgJDu4hZYUOCoq7yZ4G0QlJhMfQ8tBJ8pf9kATyEgA5FRUVhjl1mDt3c7HyX2/wvgxzHzuwORMwPmvSFwAqGyLZ1ka+bHaRxfmKXpr2FMYK19nGV+ITMHIuIY7MCoZN5fOlAyn+uiZLg4ybLnl4PgiQLKGLACqDWmao15DoDn9Kp3A0O+yALrqBmZYyUnBLU0592q4vbbb59XyRX7y5+wtVsCY1aBVQGhsg3W2RpfkWXZJ4XoBgLqUHmMYX46sykX6XOsIjNLpCzFoP1zFroNGzYIAKqV6Sdho3GRscFz2VpKkthTnpBKi5uPOmPq0S75jwuF1/PPvCgqQYAozUBEYNo1SjDnND3aNzczdZ74wxySAc/Mplqtl3zSviOw/LE92LdKMfE/lYo8p8R8quRRC1CepSJdsTJmQ83CJPxjlGXPJ8Ul1vCQiHgRr8aYg40x7wjK5W6bTUXEMbMFYEXkR0kUvag0ONi5thKRa7VaLwDRV8vWPrIrrqcQETArBJSXE5D13v3IE/6vxPZVfs5+lN3s7+VOgNt3ypRUBMYYWkDrMxHdFaXpOYEx53FuXgoAMsasAvCG+XIKU+9+b4j3MwCTMW5pW8g/8z1dYWLoC04/YcsLTzv2b73zT8mS5OpqtWZMEJCoetVda0JoHs6GWS+hzh40z8xOModtzTZacYo1IwNYOVhHwDTHSajYfQhiblxwdn9YmJ4iUC1Xa4YIUZZE/+EkfdQ/PfWUTxV7qd1uQTvHEFFYYt7ovXyJc5e/AcMCKBULWhlAIKpDAHD11VcH1SD4Tir+CZnzv2Bmw2xsz40Wpp0hZrbO+8w5+TAz/+Xg4ODWTrZJZ8IPDAzcmcXxk7Isu8B7nxQz24K5BKAMRsmLsPf+q8bYs8S7G9CTE0CkvuvZrGGuFaU9pfx8tKzdbttFUuO4Wip9OHXuncWcMl1zy891OBFSl/5bI0mfY5gD5HvMMgCjpCuB2Syeh/KejjZt2kQvPO2Yyz5+xRXfSUJ5qRK/sVIfWJuEbXQKHXt3SrpL3kj3b3MlLvMejShBlKQzSdCkhOFaBfVKgKkwRjNK4UXz3cj8pwH1UDN0l8eJqCqRBKWKEfHI0vgS4/y733jWKVcDSyMmWmBvtxXAWVEUPR7MTzLGHARBFQzDgDfGsCG6AgCOPfZYX2iGn951110nL1u21/PA+CsGrRfooKiUCKQMiojpNoV8LxW9oF4qXTUfl0jn98HBwa0AXhDH8b/EafoUa+3hDJREqeXU/568/169Xr8qX9iyVZ3VlnvMRFWlMAynYehSC66ByDPABL0lCIJ0NzmpRERvzzT7Pgm/QhWnsOEhVbEiPiPwVib6kTBfUA7Kl05NTS3LsuyzxphBQFNmKovKTfME6x+CGSmFxpuYmDAbTz89BvCBD339e1+AylvZmLPL5YpJotAXosA54VChaeY4P3bdCYoqmnGCVpTAi4CJ57j1VRWGGXsN1FAvlzDZjhGmGQjIha9nv6Y61wzV2ficN9aaoFw2aRT90jCP/9OZp1zSw/q8xy+6S/C0Wq1+C8C3dpcw3SU8LQDnATiv0dAVGaUrTZnqmiYOmZmcmtpyZzehUDebV9eCWN66FUErmDTV2Jbe85733DA+Pv7bBRZPC0CcuCF0XlSxQlrLjY7lU6/X/wjgzN1p+UVMzW8B+Fa73V5ra7XVifMDFOiUwmweKpxFY2NjPDIyMgng2XtyDTwkGZ5VaeJizPQt+PgVV51mrN0UVCqnuixDkqY+D0XlXpQnHXUw1o0MFYnOXfyXUIRJhkYUI/OSlydTUcvQU7mtRSoZF7MkTDJMhzFS52c8LdoVt/vV7XdhRzNEYAAVFRBRpVYjlyZTqvrvVS69/zV/+agGVGnsnvdUmDWkZzsH6Xxb3d6J1EVntyAFXS91Xjdni6oOpZn/IhtaIyIERS3z/vZ2Y/qJK1euTArXu5522mlzwhCpc98IjHlCZ78JgJxzTw+C4MsdDpb5QgR7wOFpFnqmXppA3bXb0kOCD9Pu4dKuGwHfoVV/AdF3JyYmzmiuPOhFSnhTpV4/MIlCiKhnkJnr5s9/j51DM4oRpa5T0dg1Q3WXehzqLMvFujxQKaFasmhEKRpRgkyKWoSCfkFU4VWE1WhQqRh4B58mFwcuHX/d08/4zQyzM5Efv/eoAXQhfsfdaAzfzWK9YcOGXlfuQpOXfgckBxpaY5gP7QSVS4Hdh3XwpUT0r/NdM8pjfCdL8UoYgBc/7Vzr190LxT2Z+F0CRUVNIW2Y5daU+TQ/+mSzuFsNRD5w2fdX1Kq1NxtDr6xWa+UkbOkTjjoEa4YHaWbfFscIkyzXXLS7rOZZb+OMHUTdBbKE1HlMRzFacZaX8xDwy9vukqnEcblcRhrHPyuJnPPms0796j1pWoIHXlsyQ0TeOX2TMXivg6QEWAOG9947596eZdkF55577rZNm9ZTs/mk5ZVK5ZnM5t3G8HJXEChZwGZZ9plSqfSchxr35J9Vq6wLLr/qeFuxbysFwZmPO/JgDJcspuMEYZLO7NvmTVZeJGVEFyyLy3NC48xhsh0jyjK9fnuT/rh9520l4nPdTv+R8RecHnezVD+ABSnYunVreWUYui2ViimXy3bZsmVtInILUpVPYyQb8D8JjHm4AI67GMBSl20j0O1ExASsNSan5ys4Oj0Am7qskUTxowcHB3/bzcfZxwNf6OZt9PG/P/nlXx39sH3/Y6RWW91ot0EgMrtNOFAsRKuwcJxdQWAEliX04CtvvPUT/3f7rW8+d+NTt9zdJiF/Cq0VRdG7giB4NoAYUKuKSuJkfKBa/th8RLNdVHzHOe8vtcaskpwDUCgXrN7czcznDA1swOy9TxOXPLdeqX++r+UeyHu6JexROg05nvWooz7/ye///HkH7bv2zLW1ki8Hxjjv8ywI6vY2dNUG6K6xbJqPtZlmt36GGYaAyVZEd0y3USL52Lkbn7plYmKitHHDhuziPdxr/clWP2PWGWMOwJzKhGx0N256JqKrG3F8egV4f2DMExeJvQadRGvn/ZVZmr65Xqt/vy9wD2Kh62CcSKBKE+vXm0bmh26+ayfuIsGBq5ZjRUG358R38d/oYtu5Xf9Ms7QP1jBaSYpbt03jrukmbGDhEhkqtK7Hg2jvxkRJngYJ16lGyATZEjhbuMhvfFKWZacB/GQiPQ7AShEZAcEz8RQRTTmR6xX+srK98rKgdrrrC9yfidAVM0g3KvzHrriKyoFBoxXhl7dtwehADfutGMFIrQqBQKQnl7JLran2VojPCqJlRuoFt+yYwm07phAmGWwRU0hVJadBn8CDMDmIOwSvee01L5UsiYlIgiD4LoDvAsC1115b2meffQZFxI+MjDQXMk/7IvDnIXQzRduSd+YBFfbk5ukWtjbbWLNsCAesWIaBcgAvMhuam5ObNKcBAVQBa/JJeFejjT9sncRkmICZYI2BqsCJIs5SfgDs02hPe8Qpd8Zs1j7Mact3f955WmAJEaWY5UzBPG2ueuNkem8FprvjfHvYo2/JY9Zz/N2K783TF/BeHYf7V9N1ZYgIkGcCq8IYhipw+45p7Gi0sf+KEaxbPoySNcicnzEbu8dBVXPBYsJ0lOCWbZPY2mhDAJQNw6tCClHNY+V3g476ngmVdmdkdAV/5w2GLxTPIxHqLeL0s0mnpkh9kXnOO3PNnuYi847DxbgYG2mj7Ca4rQtpwYUEtVuo52tyslDAfTdjtkugfU+PX2IvP93TcXigCZ12p+LnAWsU7CD5TC0bg8wLbrhzG7ZMtbD/yuVYOVgDCiZo5L3KZ/ZtceZw645p3DHZQOo8LOVMjTPCltfb6f0hcN2pcQuZazfeeGN51apV+8LavYymcb3OtxPRDhSJBZs2bdplZZ7PUWsYXJw3BQDdtm0wHhhY5b0fEpFQZPIuIppcIC9T5+kZ5wHgtttuqw4ODq62tVodAAeqmXNuamBg4M7OMROqZuM8C8R8k7CL8m/m+JtvvrlywAEHxJ3jF8pQ6dLSlUbS2Mc4Mygi4eDg4B9mnrunaUrxWa3RaKxzzGXheOeK+orN3YH5RbJ8Zs4xNjbGL33pS/cK6vXlKlJz3idcLu/48LnnbuvOmrm3Bc/eZ4EILYSui2Ktox58kXHCbDAZxpi8ZTNWDdVx4KrlGKlV4CXXbk4Ut+1s4pbtU2gnCQzlqfwyW63aVVWQX4flvhG8mfSrqallrlY7j42pqaoYopqT7CNE9PkwDPcNguCVIHqKqO5DwABTORPBTufcNar64SAILhsfH991YnDXYtVJSM4p9yTLstMBflFGeqIBRo21FQAZqLozde7HXvV8Ivp2ztjWoUvctZljlmVPUMVziHA8gLUgqnReCRvTypz7A1S/5Vz7E1Wi33drKSLSqampZdV69Z2GzGpAiMC1LEm+QUTv1wk1ydPck8ngqQAOY2DQe9fyPvlsqVQ/L8uS/7RsD/LwGYGrqnIFEb1bVQ92Ii933j+hamv7qkFVgSQTf0vi/ZcS5vcT0faCKdo1m8mR5Qq9MvPutEq9tloVlqjSTFz2ewJd9Ktf/OKjRJTNJ3id50mS5AgAf0/MpxPTGhE/7BVlJk6Z0Hzr29/2x7f889u+oZm/gIhuvLcFz+K+lLoe7hLtqSeXwuUPVdw13cJkK8TeoyPYd3QEYZriD1snsaMZFat+fpzIPIHy7piCuY/V3PBwlUSexcxdcbDgF2EYbglKpc9ZY9b23FkZwBoATwXw1DhJPlgulf5hpo/DbAcd6iKspKImJoude7015v917zsKobQA1gHYEAAbkix7DxG9RVUZuZWgM4REqnXn3HnW2uctEO5U5L3sVgA4gXnwVVEUvYWIPtydU1pWHWYyLzbGBJ2BVuh0u91e50ruorK1p/YOl/O8HcB5zOZJYD6o4xxygmqcZdeKyAWWeVl3bVPxbOsBrGfvnzEdx2cR0Y1RkrwwsPYDhrmXT7OGvOfdiUcefeQzplT/hoh2dgteR3DiNH2dYT7HmK6i5bwXhQKoFOOwEsAxmcUrp9rRmzvjcG8Jnr1vRQ6L9BPo7N/yI6wx8KK46a6duHOqicwLnPewnHM0qvR2X50/m4XoPqdxU0CnASzLPfzMUP2roFx6mWUzVNCJdzfM8NKVUVoulV4dpamtlcuvmLs/Eur4OcwMTzreUrJmHSBecubLmX2kAMIinFM/gEvW/lOcptNE9L5OVUJncOLM/U8lsBtnClxnK3t6HQmuYBUbqVQq50VR4ojoI50KBfHeiWAnDEY7JV0msIdYMt+w1q7PZQmiECLJi4Sd6GTh0d4KYP/O9wj0CEP0+WLxkiJ8C8mb5nVuyFtjDit5/5Fpl1xQ4tLHinYVrmvudpvAEpjg8UEcX3iF6lld/W+IiCRM47eVg+AdCoGHdwZEBS/nXCeOiMsDm3ZouGbPi6JIiOj8e0vwLO7TTd2uFeO6C505urr35OGAKHUgAgyb3JTsFbZ51JzO0IXd5zRuSnmusIGAQSBrzIFdfw+895tBlBCwnJmHuWNSE6kArloqvTwMkyuJ6JOqWiqqtGeGrDMDcoHLl2LvfdsrthOhavOULuMZSnk/PMmJgficZrN5adFcMSCizDm3sRC42IkEltgqACfZVzLx38ycTlrmA8tB8HTLfKzPU1w9AxwE9typqalvE9EfACDUqgxCZ55dGRQE5aOK584ABIwZEvigeOP1XLMplfIaQ2jOiDbUeY3eiyfCrapaK6rNO5LEHpBKqXRKBThFxCvIkPPOEPEfoagZw8s7ZWIKMkSS1SqVp/xFHL+AqtWPXKtaOoIoTdP28cx2E4BM84XNIO/TcHmcpj9w3u8w4NXlSunpZWsfoSqgohIjCIL3ttvtS4nojntD8O7jCSpzOf97lxSd3+PJRS8D7aL+U53lw9yFwb2rnPy+ti67q7tl9scXmR4/T5LkL1ut1iMM7zwq4eTIzPt/cF5auaNnlqcyCMzbVLXW0S5acD52VJQvqgxEJMy8f6s4d0zQNEclxhzt4B6bZv4bBkwKUVN8zRhTQt6Drnt0X1P8W7HMxkMRZ+nzS7b0tHqp+p8jtdpFA5XKOyzzKU7k+5wH5gmAGMNDpUrlGbOPHs6pCtFcjXfoGQIvstN7/zMR+Y73/goRuQaiv50hK53tRwPJVTuSLLvIe3ccMx8dRdFRqffP9SJb8y2uKEHZQ9RDhNlQ5v230iR9TLvVOrrRmH5k6v3zMy9bixKvoggMaox56RWqdn0xvkLBq40xJl8YOAAMh1n86pK1jx+q1c5ZPjj4oeHB+tubU1MnOud+RMQdwiYxxozAmGfdW6mT9r5N7Cz4GTq9A+5m2CEng1XoQvnR1BUetCz3U8igULoihpgz56+Lo/BJQ0ND27oObQL4QOLcNgt8CnMKR83DwzA8o16vf6Ww6ySYLc7LK28BSp07u1Yuf6brnNMA7lTVH3ov3zaGT86VBcgw1LA5o8jVdKrKWZZ9lYz5PQRDqn7/TPWKWrl8YeES59/85je0fv16CyAi5o8ScIqXThICVFWPn0PlrLO07J36ICei3vtNPss+VhTBzozTQG0gP0zFAgwVIWH2BjBhmn23Xi79bdezNQB82qlmBEwYkBasp8pgypy7PrD2maV6vYXZvnsXNpMkrlHps5ahklPXkmE+9JFxvB9Vqzfl1i1+4ETYqY4ERGtTn/2iXqr+Z6f9GQBs3rw5GB0dbTmX/DtgT+zQkwJQw3wc7i/ey7sdoJuhwtMejpLFithmCfS0oN7rDo4vxiDd8ZLeV97L3bXBjDL/L0NDQ9tUtVS0cKaCYNWWrf20QH4IgGVWM6ix9kndPW9nLHJVYWbyTn5cK5c/o6pWJ9R0nbeUe+jkX7XjeCmY1QNj1jXvbHb6vGmpVHq3IXq+MfSM6405ofLOd76hMD09EWVHHHFESkQhEWkShp2OPjPnc86vndkbUjxDlkGcm18GoMy5/6yUSuMdgevc5zysirDMM+uvePfRToWFqtLExIRRVbNj69avicituayQzDSmVL2QiFqd4ztkuneWbv2SQK7P8wlYAGhgTN0A+3dibiVb+u/AmOdWrX2KYT6+GpRfVOxVUXCEZuvWrQuJSEWy32Yq8JjZcxMx9rq3qCTuW03H1OFHnyd/cgGa9d62xLRr5rMurUbhPozTFZ1XDQsDJnV+OoD/7jx94WY8iAz+LICTmedwmB3S2SOwetNZA7VgOXQi351h/to4GzMbGxtzxef/57yftsYMS87+BRBKruJqPRXtHbqHnOdkfFxUlVut1gpjzEHGmIO8+gMU5hTpMSZ41rMHRACGOrxerACM8z71afqxznUKkl3tCdBrpzGkdLX9KqvelB9zsRBt1Hzrq7Rq1aqWV/87APsVpUjFEkC/LM7ZCYB7VaWH08MT7/0fABxWdI/tpOXUegLi3H0vHQHauXPncFAP9g20sm8q/ogUOL1SsE8LgRgG6sU+KDJSZuLjRUoX6UItdJbomenuRzA/U4fX+5wPv1V4qHmmKQ0RdlSr1R2Fm37eb8XOXV82FkJgFahlwEP3/cMf/jAIYBpU9ALp+k7q3PY6lXc5Zye4PjU11RoYGGgCGEYhqKJqsiyzPelUWdH0ZF8YnCrKjw6T5IRqtboviPYyzNTTvoe6iE9nVvZKpSKquzimGzzAO4hIxsbGFqZ46ImZiQoyZL6Uj5nu4vwWxJ01qCtLMJxnjAvPsEadnnqdldx7zz334wCg0di8Amb4RMM40Rh7DBMfRERrrDGlciESHS5QntOm4gEsdJ34CDOVbBAQhaEHwSjuZv+/rrxM7WmFVXCPCQCtVCsmSpPg/jEs53BqypYtWxZVwMba6cx7b40xynmODivqtdrK8iKP7XYzzrJAWhnNFi+QS5rNR3Cl8noFPS2wM122Ft1vdGk8nXWjhBigYekO4KuqhuHsYjA+Pr7oiGnRvlZ3P4fmGEYFlwsvvLoLDExv+EW6xiGLouggtvyPTObMnnjqPOPAC/YSe0AK3aZNmwiAGrKfitrhUaVafTgO2wpVZWamRRuH6FzB7CnzoR7KdwEkKJVNEFikYetb5bL5GQAqyHLvAwzMvgKeNV0Wfazcoc5kiLq/SEySa84FN9e69PjMjPPKlyTvyEFELkmSv7PWfoiZB4sV3DHYFt7WmAhbVfUO8fJLtmwt2xd1+FOK2TpzhYpUhHa9J1Vt61ILpnP+7pwzJ1v84O6NBhEAa60uTUiKeKcxnXHIWq3oCUEQfMoYs6IrJmk7Ws2LbDFs/yjibvTis8CWn9cVFwXfi+1i7xNTrKBFoLNPP+4jYRg9OgrDz7IJqFytskK96MJ0sbSUllsKCNSDDZXrA8Z5//skSV9UvuN3T372ox95y32dJa69y59SKSmXS4s9kpBbGeSdHaXzRe81CoIgLkJxsuuKykux36n7ZohJKiMjud0Xhqcaaz9eCFyWd4Rk68V/I/X+xWLMowybR1hjTyqXyy9PnHxIurrLFradXaiCoJOqXdWqLJ2lQGY0WYBAF9k4yx4uQjrPiNncnGwcFpTtZwuByzr98wRydeKzNyWZPzljeyxj0wmBCZ6bSXYuNO/L2OnmRFB6MOzpdEyVX5kXWD77I5f/7NNOZKxWqx+bpSmyLKfrI5rHy7LY2Gre6KNWq5skTsI4an/YEL/vhSc/ctvukl3vLRjuWb2JVgyI7K2qUwtNDkt6eIfYbGajD9m21157tYomHh7c26txKb1aOl1TZ90NiOPOSv92w2ycwFnOWZdTJ+eUAzvWm1GvqjZ2bpRmY4SdP5rOmEZRRMMjy3Quma8s1YeVf08YM/kyizqydT438cLjIZI3U5w7uQ0AmFLpjSVrlzkg4/z1cSpyXon5tRVr0m5ni+omk2XZcMd7zpjfe/6ADY6PE8nYmPLY2Bi/+HHHf2Xyrt+fHIXt1zrv76zWB01B4LgkOgXJs6d9UK5wqVzhLIkvNSynvuTU497wolOO2TYxMWGWSot+j71DvoueBfCBNeWgXDujyFSw3SGDrqjCWei0ycpXTzVE185kN8iec9gUHogeIVCqjIyEN99812pL9BcAlHKLjlPnf3/rzTe9u7i3oKtnnCEiB3WHUc8WRgVUbBdQq9VmFxqZdTC0221aqtARZGnx2m5NV7xSu1hWYXF84QApMiWM0zxN5dQ8PC/MACfO3RUxv42I0q7egJ1x8JnPjjbMUBEvM0aN8oNC6HJTk2R8fFwmJibM6zdujF506nH/HofuhLDV/pASpZVazUBVVEUA3TUep1Cv6o0NqFyrmSzLfpVl6d/8/cnHnPn8k469uojtUEGIpPcTndNsNreARKBByb5uOo4PLvrRzRSXEpFrJeHzmM1jAAiYCfn+jxS4rCtMR3fv7eiu3aFb0HLZLGeiOgCacS+IZBdddFHWI9ScT76dwwzzipkAjex6P2HHY9LdRgtAvV5flKD4bkZ0tHftcUs6nrvblfhNm8YM5aED6iRbMyBuxw7fU8Rq8tjn9qFSqfyquVFi3L9NIe8tbNy40aMIgL7yScff/uLTj32Vz9zpcRh9w5YrHJTKnDclkdwVqQVDM5Rq9QEj6rdlSfzWvUz1pBeeeuznANCYKm/cuNH/yXgscxOEAdGyNXvXrP1WmITPubPZXHmb3lbdvn37umaavrZsS+cp5VEfgSgAyrz7XaM8eXlX0jN3xci7CAYXb/Y9MyNn7SATZZPVgYHSVhA1u4wzCQwf8trXv/GlxYIw0zRyR7O53svwl0pBcKiHCEF5piNa1wypVqt7bmV1mq3skjGrqqqL7iP2iNFupsW8wBcLhvfejI+POyXaJiLa6VgbWLumWh98Xdc4OCJyk1F0QOaXfd6yORQgz8zdZcX8YInTLcgQvX79etp4xvE/BvCk87/10+eQNf9crQ8cksYRnPOeCFSpVjlLE8ni8JOs9K4XnnrM74BZktvxBwDxUJ6omL8ba8x+1lQvMsZtIb+2SSNYbo3ZK885FGi+nxMANvFyzhq7pl0kPKedyPgcL5xZ/D2PjIzAeeldCNiJ1IeGhm5NnfsBgDNdHlC0xhgMDlTPS5LkWQCuBOA9cIRlfmKnXMYWAT+drWQnYBOAcWhNleZp695eWpISz526ujvtR3tkbtNsc6jiEQgG5eKzbzPzEQK4PBtHtVYpjcVJcgYBVzJz5FQPMUyPCwzvNROh7GrJzNQpVbznc87+KSZqh/S16JSjL338CZ8+79IffC1S+f/ImH8YHBoa8T5DkiQ/JKbxF5x8zOU9DM1/Ulo9nRWKQmv5rURoWTYHApKVjF0NYPVMV18IFym/xICN0vQ/BsvlTxVarsgBVil+9zOTy8tSZnPxPfFFrkeKUkkAII39Jq3itBKbQQ84BZiJqFQqnQHgjN4olBN/PYGWGeZRZfYADDHJ+k0XE8YBtEOgtMx33SdAcPUlmI5EM8wdfj7Nt8Ag+w7bBwEEt5iBmY8D5z31chr3IiWwZO25mfdPCYx5mKg4VWJmaLlUOgnASbOCkF809sm1hsyKgO3orFWrNF9h8APavFyQrq/oCPSKp548+ZLHHj+OBI/xSfIx9vLqo2v62BedfMzlY2NjPDY29qc1Jbv37J3Y7iyHyeYwc0/2It8DZotbO119GcwGbAyYY5e+v1oqvbar5q0zu8pF4m256G9n1HB1sRuZnp4mgQwXzA4lAMarDpVKJQ8AAwPln2eiG7zIHQawHaYx3aX7KiPz/stpnDwO0Du7e9NZ5pUbsMECQBCUy6o62v13VR3BwBL2PqwDAIwp7tMYa4lowUQGL754LpSLolbju9K6diWg43rX+AUAjJ81w/8YO3dm5v3PmY0trEaeT11m4j67M0xPd+K3d53PMPHoPA1PHjyabr793gxD9BOO/S2AszFPv4QHAtrtNlfr1bmMnaq1f3vPe36/adOmx2fev0CBv2Gi9VCtFiU9OwXyUyfuf6pB9Zs93XcUAHzmLk88jIekANgyV72TXy3mhBgeHo5aYfhRr1gJIGMi68WHkrrJLvbob7S1fYJ1pZcb5qcSYz8VBAIRhU4C9DMV+VwpCD5f9AS/QEHHqEhGQEXE3QxYn1tatWaa+f9mKwMQ8QSUBLptAAOt3Y1blrgvgOUGL5KwYZAKMadb53m+glrCfVnAdwo0LtiOWIA/AHnmS+/xUZZdZlWbTiRiIirMwd922oQR0fV3qZ66zPuXMNEzCXiYwlcUEOZgGiLXCMuFJRN8GQBaaXpBJnKkE0kC5pKo3Ig/V4yNKY9p/gNVegDRn3eoD1Y773eoqnrvnapqmmW/VtVKz/GjYRjup6p7b9Ntg3NjQfffc3WvzkUFxNooih4WRdH+qjrY5dggfQCN9305DgBoWnWvUHXftrbXqepA93v+cx6HB9tLIwBotVprOkLnXC50SZr95sYbbywXL8wu9NK7eCnnWWzGuDim+4eWMpl6fxY4t1nKfe3ufEu53h7cJy3xeNMJDe3u+ImJCTOhaiZmY2/oEah7ZRz6+FNrujS7Tm++udJzHO2J8Nxfz9Aj3PRQfZed9zOmY9zXbA8GoXO7CN31qlpdjOS1jz4eUI6UBxsK97foLI8QgM19YeujL3T3WTycuQ6ATZGwoCQ1bOG+0PXRF7r7BNPTSVqr/RDEQwr1AGqZy24rrV7t+oPTRx/3ofu583PttdeWrr766qA/Kn300UcfffxZuZu559/uMAH1hAt4vs/mixH1uvG7v7OQ23uhuBKQx+cWCsh3jllKXLD7/ha7h4J9jBY6ZoG/8WKV6fONQff35rvnPRxf6h2HRZ6/v2/HAyKDZozvxUwJLDKR6AGQyXGPv3NPgsyLLAq0J9fb3TvrxDPnO7YveH8CtO5qrW40GqOqWm02dVV3B1RVHW42m6tUdThN079IkmR9mqYnxHF88J133llvJsmR7TQ9LkmSY+66666BzguMouigJEn+Ooqix3Vfq9lsrkrT9LhIo4PmiRfWi2vRFVdcYSdbrUe2kuToZpIc2W63j7/jjjtqYaj7qGptOo4PVtVy1zmCOI4P1ju01mwm69tpesJ0GD6m3W6v6w3wF/8e3AzDZzcajVN6sjZqN91003DnuG3bdPDOO+9cCeQ5swAwNaXLVXWNqpqtW1tr5mjZu3QgiqKHzdE8d2itO6tHVWuaJEeqxofMfLZdh6IoOkhVqdVqre7R3EEU6cM6hLTFZwcmSbIhTMOT5rzLlq4u7o83b28cliTJI1X1wF3HOjrQObdBVVf3Be/+XfHzSTTd/mgSRe+dnNSRZju6JopygVBVarSjl7Xa0afDMHxMkiQ/S7Nsa+bc9a1W65+2TDaeESbptnaSfqcZRle2Wq1jAKAVhm9J0uy3SZpORHF8ZRQnVzWTZD0AtNrRJ9Msuz1N02ub7fa7O8m7ABCG4d+12tGn8sm+bXDndOMzSZrdkqTZne0w/lqz2Vy/s9H66WSr9cipZmuiFYZv7TxLo9F+Sbvd/trk5OTRYZxMN6P4mukw+uW2qalXdCbwWDGJ21E0HqXpDa0o+eJ0O/zNZGv6hZ3zTDUaL5luts/p/P/WrVsPbrTCn6hGB3bGZLoZvzaK4gvGxsa41Y5/kIbpqZ1rTLfip0y3o593qDby8Ug+3GxGp88KRvh3LnNb0zS7Nozj8wFg+/bGs5phdFWegB5/LoqSv++cc9u2bYdMt8Pfquqa4v7fmTp3Y+TcF8MkuSrOsp9unZ4+GAC27pyeaMbx62+66abhnc32tlaU/CxN02uS1F0+NRUdqKoUhuHJSZpen2TZ91pR9JPt27fvfU8Fr59PtsfCJwFb5l/8Ai0QDhPiy6NI9ycitURDBKyr1Wo/3rlz5+nO+S1O9VUDAwPvKRmzxqXJNfVy6bE3XPebUwYGBn7ebIYbifhlkXdnlkuljdVK5dFR5j4hzg0WVdB7ZWn6vqAVnMjML71rauqgokeBFeIXK+nG7dvbe69csaK5fHjo2aL4tKj8pF6rPDmO49ss03CAQEn8v3vR58xoO0Mv8cBH0zRV9f6uuNU87d/e95NjR98//F+dvdk4kTSbzb8W0b+KnHvCQLV8VtxqnhCm/vKORimVSi+zAb+m0WiMAkCW2aQUmGPDhL7Vbrf3JiI1JIGIVsfHxyUIeC0F/NV2O31UTmXhA1UNDj98g1FVaKJH1KullzHLyzrj7Zxb58V/Pwzbp6joM3bu3DkciYu9agAAbKlSLgcfb8fxs/KGj1KFUh2bMb2jOfVspzh7ut0+s2rtWdf9+tePEe9/UzHBhejwRQlKWZYFDEqzWDaGYfg4gtzOVj+dU6zLc1X1lnIQnBo2m39X9FvAg7ae7kEqdBFE4sMPRwVEv/WiX1FKv6Ot1moi3RlYkwDAHXesTp2XJMuyFADEu6hUKj0mDONvPuKIw78ZhuG+ZLCRmf5npFr9vaqWG3F8+LKB2mVpiNuKmpUpBR4V1ZIXe9E/Jg1MqipNT08/U8WH3skHK1V+rc62VctENQWA0TT1RAhT8cPDw8M/ZoOdiXN/GYaNkwioDtZqXwBAHroyqA187Y1vftT3kn9sPBkArrnmmqJc2jyfmP5tea1267XXXltatWpVa93y5bcBQNSK/hqiN4uXS0wQvB4AggFTEdFfsOrFmeDL21WHKsbsYCr69aluFfHnKfsLmkmy3iC7XXP6ChCRxpKe49L03WBe3Ww2T8+1iTQBHBGUKx/MnNy+fPny6bwFfc5abQg+y/wHSOkdSZJsiGPZTATdjM0omdJzrDXjK4aHb1DV8nHHHZdVt259JVtecfv27XsbppZlNhgcBEFdEPhkZGRkMpicfDWTrtgyNXVgHMf/47w/JEzSL1eGhoLR0dHGPTUv+0K3hzCWvQCWV4IYWBP67F3OZefHgf0SmPd30AYAHHssQIAnynmBmHiAiW9hwQfU639Up6d3MMCqPgaAHTt2lFXkdVGSfKFU0++NjY0xiLazNc9U4I3qsg377juyk4jUBsGrDIGJtM2GX7C50VgBAEmSea+aAcAWZlLVQFjKqkrk9eNQ/1KFfZMqPkdEaoypiOJONvT/IPLeMPXX5vd+rBTV3RUpqMnXr18/Zxw80yviLM2SzG9n5hepquUsC53IcKVSeaeqfrYWR99UxqGGKSnIbQcAXJik/nXi3OeCoHKqZU7Xr0fWbDaPIMbTW3F4k4pYGwQvLuoNEyGCqlxnWePp1vRT4CWkDlGs+BHn/PfiKP0br/qBtXsvezkTmu122yoQqPfJnL4OcSzqhcXaMjMzkVput0lVOEkSCwA7pqcZBKfeV0dHR3+2eWrqeBX/24Do29PT048p7ov7Qnf/IWBGVQAlJg2AFUMDA+9LRD9uAvtWKSY9brnFMGPAWmuLVs/Wuey2ykDlq5V6/RJas6adiVyi4LNVdcXo6GhjuFY7Gyw/D6y5YXx8XKC6Mk3cu7xzV9pS6TQA2D49fYIyHyyghhIdIISp4UrlbwttYQlaAgA7NcVEVOpokc2b6xcJeK0SndxuTv8XAEgigVGEQ5XKl+r1+leWL19+a/eDOvhLBHjNdt0+VNDVlVR1oNFonAqmg4lNxVizDxRJlKbPbLfb7cBwJUmSvZcNDfwLiL9qS6U3CCQqivZcKrJmr+GBy5ToHDb23HIQVIlIwXidgm5gUz6TyEQKPb2oUnc+Ta8bqNXepYZ+lzp9pg0onNGeuYk5unz54K8ykWexMf9gDK85+KKLWuL9pQq8cUp1GRHFRCTxfvu9zasm//P+999MpHUi4yuVigdBkySJVTWo7bfvexLnGz/49revD8PWG1fWagfUq9U3QdwfTLl80j3tU9dPA9vTAet01Nm8WWh0tFGzNi467/xXK05HAuZHF5yLBFVYm3OCsDVblfmEdhp/mqFlkuytlcrAJxtheHyaZT/I0vT7Aj3Yq6zN4vSpxSo+UC4Hd021wrfWa9VvTkVT3yFvXgPg/IFabRMATEXR41jxXlX99+lmMzOcOxcnjaE1gBiTm5sPfzglzTD8BIhWrFmzZmuurXxiDB3ajuMfQD158ecO1Ye+2OUo+NB02DqymtV/HKbpT+IkOTYS9/5KufxUqH5wcHDgnFzDJhud6suGh4d/ToBHuSzFmLwjTdNMwYeqKsVxxCVrXfG3CVVXEy/P397YfhhAj56OwqesHhn5Q+5QaV3cCluv0iy7ytSqpyRpcrkTf0CaphvKJR71s1QZGQNRcc4rwzT9S/HykdYb3rDimwNf+/CT4zOPK6fpj8I0/pEB7+9V9wXhuePj4/LaN7zBgyVtNG5KR0aPL42Mjn4icemwApqk6fM2btzo21F7RaVS+UIURf/nREan2skl93OTqIc0KPeWbV/Xam1do6omjuNDr7322lK3yzqO48M6Qdc4bhyqmrf/nZrSZe00PT5M0xObzeYZU1NTM408psPw0XEc/mMYhs/btm22ynwqig5sFKZjo9E4bFt729pGfv5qd8C20WgcqqrcbDZXTUVTHc+hKa5f7QoE17tDFbfddlu10Wic2Iyi05vN5mPb7fba+TxzYRqe2ArDf5xqNp89NTW1LFE9SlUrXQFlG09PH6yqg0nSfETBcDYzJlEUHVDc35FaVNF3/63dbq+dnp4+pDuQf8cdd4xOTU09bOfOm4abzcnTo6j5+OaWLavysZxavn379sOL7x+oO3cOz/EwR1MHbd++fWj2/tPHtMLwH8Mk+es777xzhqRzZ7hzv0ajsWJCJ8zOVuuodpqe0GwmR/aGDKIoemIrDP9xx44d+/RDBvjzDK73vtSxsT9d1fI9nWC7CVzTnl5rbDd7qd1luCw1QL9Qxktf4P6EVceLZJPwfHwo86WGzZNmNCfVqKjy7k5Tot2kdFG3EC8hbWtP08DMEu6BFykA5oXSxBa6164OrbuM5e5S3HY3voukgc05X6dD7D3NPuqjjz766KOPPvroo48++uijjz766KOPPvroo48++uijjz766KOPPvroo48++uijjz766KOPPvroo48++uijjz766KOPPvroo48++uijjz766KOPPvroo48++uijjz7+1Pj/AYpW0RR4ACBqAAAAAElFTkSuQmCC";

/* ─── Helpers ──────────────────────────────────────────────────────────── */

function portalBaseUrl() {
  return String(ENV.FRONTEND_URL || "").replace(/\/$/, "") || "http://localhost:8081";
}

function leadPortalUrl(leadId) {
  return `${portalBaseUrl()}/leads-medicos/${leadId}`;
}

/** Formata minutos em texto legível: 10 → "10 minutos", 120 → "2 horas", 2880 → "48 horas" */
function formatMinutes(min) {
  if (!min) return "—";
  // > 2880 (48h) vira dias — o prazo padrão de 48h exatas continua em "horas"
  // (48 horas), não "2 dias", que é como o time trata o prazo internamente.
  if (min > 2880) {
    const d = Math.round(min / 1440);
    return `${d} dia${d > 1 ? "s" : ""}`;
  }
  if (min >= 60) {
    const h = Math.round(min / 60);
    return `${h} hora${h > 1 ? "s" : ""}`;
  }
  return `${min} minuto${min > 1 ? "s" : ""}`;
}

/** Data/hora de prazo: "até 18:30 de 26/08" */
function formatDeadlineTime(minutes) {
  const d = new Date(Date.now() + minutes * 60 * 1000);
  const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
  const data = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" });
  return `até ${hora} de ${data}`;
}

/** Data/hora atual formatada */
function nowBR() {
  const d = new Date();
  const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
  const data = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Sao_Paulo" });
  return `${data} às ${hora}`;
}

/** "SUDESTE (Guarulhos / SP)" */
function formatRegiao(lead) {
  const cidade = [lead?.cidade, lead?.estado || lead?.ufCrm].filter(Boolean).join(" / ");
  if (lead?.regiao && cidade) return `${lead.regiao} (${cidade})`;
  if (lead?.regiao) return lead.regiao;
  if (cidade) return cidade;
  return null;
}

// TEMPORÁRIO — enquanto a gerência de Lucas e Samuel não está 100%
// configurada no Zoho, os e-mails de gestão desses dois também vão pra cá.
// Remover quando a gerência real desses consultores estiver correta.
const GERENCIA_EMAIL_EXTRA = "samuel.bispon01@gmail.com";
const GERENCIA_EMAIL_EXTRA_CONSULTORES = ["lucas", "samuel"];

/**
 * E-mail(s) do gerente responsável pela gerência do lead — não existe perfil
 * Gestão para esse fim, só Gerente e Consultor.
 */
async function getGerenteEmails(lead) {
  let emails = [];
  try {
    emails = await findGerenteEmailsByGerencia(lead?.gerencia);
  } catch {
    emails = [];
  }

  const consultorNome = String(lead?.consultor || "").toLowerCase();
  if (GERENCIA_EMAIL_EXTRA_CONSULTORES.some((nome) => consultorNome.includes(nome))) {
    emails = [...emails, GERENCIA_EMAIL_EXTRA];
  }

  return [...new Set(emails.filter(Boolean))];
}

async function sendEmailToMany(emails, payload) {
  const targets = [...new Set(emails.filter(Boolean))];
  if (!targets.length) return;
  await Promise.allSettled(targets.map((to) => sendEmail({ to, ...payload })));
}

/* ─── Status → cor ─────────────────────────────────────────────────────── */

const STATUS_COLORS = {
  "Lead Em Qualificação":  { bg: "#dbeafe", text: "#1e40af", dot: "#3b82f6" },
  "Lead Com Interesse":    { bg: "#d1fae5", text: "#065f46", dot: "#10b981" },
  "Lead Sem Contato":      { bg: "#ffedd5", text: "#9a3412", dot: "#f97316" },
  "Lead Sem Interesse":    { bg: "#fee2e2", text: "#991b1b", dot: "#ef4444" },
  "Lead Convertido":       { bg: "#dcfce7", text: "#14532d", dot: "#22c55e" },
  "Lead Rejeitado":        { bg: "#fee2e2", text: "#7f1d1d", dot: "#dc2626" },
  "Lead Sem Tratativa":    { bg: "#f3f4f6", text: "#374151", dot: "#9ca3af" },
  "Novo Lead":             { bg: "#eff6ff", text: "#1e3a8a", dot: "#1a2f5b" },
  "Lead Encaminhado ao Marketing": { bg: "#ede9fe", text: "#5b21b6", dot: "#8b5cf6" },
};

function statusBadge(status) {
  const c = STATUS_COLORS[status] || { bg: "#f3f4f6", text: "#374151", dot: "#9ca3af" };
  return `<span style="display:inline-flex;align-items:center;gap:6px;padding:4px 12px;border-radius:999px;background:${c.bg};color:${c.text};font-size:13px;font-weight:600;">
    <span style="width:8px;height:8px;border-radius:50%;background:${c.dot};display:inline-block;"></span>
    ${status || "—"}
  </span>`;
}

/* ─── Template HTML base ────────────────────────────────────────────────── */

function buildHtml({ badgeStatus, title, intro, leadInfo, bodyExtra = "", ctaUrl, ctaLabel, footerNote = "" }) {
  const { nome, regiao, especialidade, consultor } = leadInfo || {};

  const headerLogo = `<img src="${LOGO_DATA_URI}" alt="TegraPharma Corp" height="64"
       style="display:block;max-height:64px;border:0;">`;

  const labelCell = `font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:0.09em;width:108px;white-space:nowrap;padding:5px 0;vertical-align:top;`;
  const valueCell = `font-size:14px;color:#1e293b;padding:5px 0 5px 8px;vertical-align:top;`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

        <!-- Header -->
        <tr>
          <td style="background:#1a2f5b;border-radius:12px 12px 0 0;padding:24px 32px 20px;">
            ${headerLogo}
          </td>
        </tr>

        <!-- Faixa gradiente -->
        <tr>
          <td style="height:3px;background:linear-gradient(90deg,#8FA9C1,#E5989B);"></td>
        </tr>

        <!-- Corpo -->
        <tr>
          <td style="background:#ffffff;padding:28px 32px 32px;">

            <!-- Badge de status -->
            ${badgeStatus ? `<p style="margin:0 0 18px;">${statusBadge(badgeStatus)}</p>` : ""}

            <!-- Título -->
            <h2 style="margin:0 0 6px;font-size:20px;font-weight:700;color:#1a2f5b;line-height:1.3;">${title}</h2>
            <p style="margin:0 0 22px;font-size:15px;color:#475569;line-height:1.6;">${intro}</p>

            <!-- Card do lead -->
            <table width="100%" cellpadding="0" cellspacing="0"
              style="border:1px solid #e2e8f0;border-left:4px solid #8FA9C1;border-radius:8px;margin-bottom:24px;background:#f8fafc;">
              <tr>
                <td style="padding:18px 22px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    ${nome ? `<tr>
                      <td style="${labelCell}">Paciente</td>
                      <td style="${valueCell}font-weight:700;">${nome}</td>
                    </tr>` : ""}
                    ${regiao ? `<tr>
                      <td style="${labelCell}">Região</td>
                      <td style="${valueCell}">${regiao}</td>
                    </tr>` : ""}
                    ${especialidade ? `<tr>
                      <td style="${labelCell}">Especialidade</td>
                      <td style="${valueCell}">${especialidade}</td>
                    </tr>` : ""}
                    ${consultor ? `<tr>
                      <td style="${labelCell}">Consultor</td>
                      <td style="${valueCell}">${consultor}</td>
                    </tr>` : ""}
                  </table>
                </td>
              </tr>
            </table>

            ${bodyExtra}

            <!-- CTA -->
            ${ctaUrl ? `<p style="margin:0;text-align:center;">
              <a href="${ctaUrl}" style="display:inline-block;padding:13px 32px;background:#1a2f5b;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:700;letter-spacing:0.02em;">
                ${ctaLabel || "Abrir no Portal →"}
              </a>
            </p>` : ""}

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;padding:16px 32px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.7;">
              TegraPharma Corp · Portal do Consultor<br>
              ${footerNote ? `<span style="color:#64748b;">${footerNote}</span><br>` : ""}
              <span style="color:#cbd5e1;">E-mail automático — não responda a esta mensagem.</span>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>

</body>
</html>`;
}

/* ─── Conteúdo por evento ───────────────────────────────────────────────── */

function leadInfoFrom(lead) {
  return {
    nome: lead?.nome || null,
    regiao: formatRegiao(lead),            // "SUDESTE (Guarulhos / SP)"
    especialidade: lead?.especialidade || null,
    consultor: lead?.consultor || null,
  };
}

// 1. Oferta SLA → consultor
function contentLeadOffer(lead, consultorNome) {
  const minutos = Number(ENV.SLA_OFFER_MINUTES) || 10;
  const tempoStr   = formatMinutes(minutos);          // "2 horas" / "10 minutos"
  const deadlineStr = formatDeadlineTime(minutos);    // "até 18:30 de 26/08"
  const fila = lead.regiao ? `da regional <strong>${lead.regiao}</strong>` : "sem região (fila da Gestão)";

  const prazoBox = `
    <table width="100%" cellpadding="0" cellspacing="0"
      style="border:1px solid #fde68a;border-left:4px solid #f59e0b;border-radius:8px;background:#fffbeb;margin-bottom:24px;">
      <tr>
        <td style="padding:14px 20px;">
          <p style="margin:0;font-size:13px;color:#78350f;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;">⏱ Prazo para aceitar</p>
          <p style="margin:6px 0 0;font-size:22px;font-weight:800;color:#92400e;line-height:1.2;">${tempoStr}</p>
          <p style="margin:4px 0 0;font-size:13px;color:#b45309;">${deadlineStr}</p>
        </td>
      </tr>
    </table>`;

  return {
    subject: `Novo lead ${lead.regiao || "Gestão"} — responda em ${tempoStr}`,
    html: buildHtml({
      badgeStatus: "Novo Lead",
      title: "Novo lead aguardando sua resposta",
      intro: `Olá${consultorNome ? `, <strong>${consultorNome}</strong>` : ""}! Um lead ${fila} foi oferecido a você. Aceite ou recuse no portal dentro do prazo.`,
      leadInfo: leadInfoFrom(lead),
      bodyExtra: prazoBox,
      ctaUrl: leadPortalUrl(lead.id),
      ctaLabel: "Aceitar ou Recusar Lead →",
      footerNote: `Gerado em: ${nowBR()}`,
    }),
  };
}

// 1b. Oferta SLA → gestão (aviso informativo)
function contentLeadOfferGestao(lead, consultorNome) {
  const minutos = Number(ENV.SLA_OFFER_MINUTES) || 10;
  const tempoStr = formatMinutes(minutos);
  const deadlineStr = formatDeadlineTime(minutos);
  return {
    subject: `Lead oferecido a ${consultorNome || "consultor"} — ${lead.regiao || "Gestão"}`,
    html: buildHtml({
      badgeStatus: "Novo Lead",
      title: "Lead distribuído para consultor",
      intro: `O lead abaixo foi oferecido a <strong>${consultorNome || "um consultor"}</strong>. Prazo de aceite: <strong>${tempoStr}</strong> (${deadlineStr}).`,
      leadInfo: leadInfoFrom(lead),
      ctaUrl: leadPortalUrl(lead.id),
      ctaLabel: "Ver no Portal →",
      footerNote: `Gerado em: ${nowBR()}`,
    }),
  };
}

// 2. Lead aceito → consultor (confirmação)
function contentLeadAceitoConsultor(lead, consultorNome) {
  return {
    subject: `Lead aceito — ${lead.nome || "Lead"} em qualificação`,
    html: buildHtml({
      badgeStatus: "Lead Em Qualificação",
      title: "Lead aceito com sucesso!",
      intro: `Olá${consultorNome ? `, <strong>${consultorNome}</strong>` : ""}! Você confirmou o recebimento do lead abaixo. Ele já está na sua carteira e aguarda qualificação.`,
      leadInfo: leadInfoFrom(lead),
      ctaUrl: leadPortalUrl(lead.id),
      ctaLabel: "Abrir Lead →",
    }),
  };
}

// 2b. Lead aceito → gestão
function contentLeadAceitoGestao(lead, consultorNome) {
  return {
    subject: `Lead aceito por ${consultorNome || "consultor"} — ${lead.nome || "Lead"}`,
    html: buildHtml({
      badgeStatus: "Lead Em Qualificação",
      title: `Lead aceito por ${consultorNome || "consultor"}`,
      intro: `O lead abaixo foi aceito por <strong>${consultorNome || "um consultor"}</strong> e está em processo de qualificação.`,
      leadInfo: leadInfoFrom(lead),
      ctaUrl: leadPortalUrl(lead.id),
      ctaLabel: "Ver no Portal →",
    }),
  };
}

// 3. Lead recusado (explícito) ou sem resposta em 48h (timeout) → gerente
function contentLeadRecusado(lead, consultorNome, { timeout = false } = {}) {
  return {
    subject: timeout
      ? `Lead sem resposta em 48h — ${lead.nome || "Lead"} encerrado`
      : `Lead recusado — ${lead.nome || "Lead"} encerrado`,
    html: buildHtml({
      badgeStatus: "Lead Rejeitado",
      title: timeout ? "Lead encerrado — consultor não respondeu" : "Lead recusado pelo consultor",
      intro: timeout
        ? `<strong>${consultorNome || "O consultor"}</strong> não aceitou nem recusou o lead abaixo dentro do prazo de 48h. O lead foi encerrado no portal e devolvido ao Zoho CRM.`
        : `<strong>${consultorNome || "Um consultor"}</strong> recusou o lead abaixo. O lead foi encerrado no portal e devolvido ao Zoho CRM.`,
      leadInfo: leadInfoFrom(lead),
      ctaUrl: leadPortalUrl(lead.id),
      ctaLabel: "Ver no Portal →",
    }),
  };
}

// 4. Tentativa registrada → consultor
function contentTentativa(lead, consultorNome, n) {
  const ordinals = ["", "Primeira", "Segunda", "Terceira", "Quarta"];
  const label = ordinals[n] || `${n}ª`;
  return {
    subject: `${label} tentativa registrada — ${lead.nome || "Lead"}`,
    html: buildHtml({
      badgeStatus: lead.status,
      title: `${label} tentativa de contato registrada`,
      intro: `Olá${consultorNome ? `, <strong>${consultorNome}</strong>` : ""}! A <strong>${label.toLowerCase()} tentativa</strong> de contato com o lead abaixo foi registrada com sucesso no portal.`,
      leadInfo: leadInfoFrom(lead),
      ctaUrl: leadPortalUrl(lead.id),
      ctaLabel: "Ver histórico →",
    }),
  };
}

// 5. Mudança de status → consultor
function contentStatusChange(lead, consultorNome, novoStatus) {
  return {
    subject: `Status atualizado — ${novoStatus} · ${lead.nome || "Lead"}`,
    html: buildHtml({
      badgeStatus: novoStatus,
      title: "Status do lead atualizado",
      intro: `Olá${consultorNome ? `, <strong>${consultorNome}</strong>` : ""}! O lead abaixo teve seu status atualizado para <strong>${novoStatus}</strong>.`,
      leadInfo: leadInfoFrom(lead),
      ctaUrl: leadPortalUrl(lead.id),
      ctaLabel: "Ver no Portal →",
    }),
  };
}

// 6. Lead convertido → consultor + gestão
function contentLeadConvertido(lead, consultorNome, paraGestao = false) {
  return {
    subject: `🎉 Lead convertido — ${lead.nome || "Lead"}`,
    html: buildHtml({
      badgeStatus: "Lead Convertido",
      title: paraGestao
        ? `Lead convertido por ${consultorNome || "consultor"}!`
        : "Parabéns — lead convertido!",
      intro: paraGestao
        ? `O lead abaixo foi convertido com sucesso por <strong>${consultorNome || "um consultor"}</strong>. Resultado registrado no Zoho CRM.`
        : `Olá${consultorNome ? `, <strong>${consultorNome}</strong>` : ""}! O lead abaixo foi convertido com sucesso. Excelente trabalho! 🎉`,
      leadInfo: leadInfoFrom(lead),
      ctaUrl: leadPortalUrl(lead.id),
      ctaLabel: "Ver no Portal →",
    }),
  };
}

// 7. Lead sem tratativa (timeout) → consultor + gestão
function contentLeadSemTratativa(lead, consultorNome, paraGestao = false) {
  return {
    subject: `Lead sem tratativa — ${lead.nome || "Lead"}`,
    html: buildHtml({
      badgeStatus: "Lead Sem Tratativa",
      title: paraGestao
        ? `Lead sem tratativa — ${consultorNome || "consultor"}`
        : "Lead encerrado por inatividade",
      intro: paraGestao
        ? `O lead abaixo foi encerrado por inatividade. O consultor responsável (<strong>${consultorNome || "—"}</strong>) não realizou as tentativas dentro do prazo.`
        : `Olá${consultorNome ? `, <strong>${consultorNome}</strong>` : ""}! O lead abaixo foi encerrado pois o prazo de tentativas se esgotou sem ação registrada.`,
      leadInfo: leadInfoFrom(lead),
      ctaUrl: leadPortalUrl(lead.id),
      ctaLabel: "Ver no Portal →",
    }),
  };
}

/* ─── Providers ──────────────────────────────────────────────────────────── */

async function sendViaMicrosoft({ to, subject, html }) {
  const tenant = ENV.GRAPH_MAIL_TENANT_ID;
  const clientId = ENV.GRAPH_MAIL_CLIENT_ID;
  const clientSecret = ENV.GRAPH_MAIL_CLIENT_SECRET;
  const from = ENV.MAIL_FROM;

  if (!tenant || !clientId || !clientSecret || !from) {
    throw new Error("Microsoft Graph incompleto (GRAPH_MAIL_TENANT_ID / CLIENT_ID / CLIENT_SECRET / MAIL_FROM).");
  }

  const tokenRes = await axios.post(
    `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
    new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "client_credentials",
      scope: "https://graph.microsoft.com/.default",
    }),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" }, timeout: 15000 },
  );

  const accessToken = tokenRes.data?.access_token;
  if (!accessToken) throw new Error("Graph não retornou access_token");

  await axios.post(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(from)}/sendMail`,
    {
      message: {
        subject,
        body: { contentType: "HTML", content: html },
        toRecipients: [{ emailAddress: { address: to } }],
      },
      saveToSentItems: false,
    },
    { headers: { Authorization: `Bearer ${accessToken}` }, timeout: 15000 },
  );
}

async function sendViaResend({ to, subject, html }) {
  if (!ENV.RESEND_API_KEY || !ENV.MAIL_FROM) {
    throw new Error("Resend incompleto (RESEND_API_KEY / MAIL_FROM).");
  }
  await axios.post(
    "https://api.resend.com/emails",
    { from: ENV.MAIL_FROM, to: [to], subject, html },
    {
      headers: { Authorization: `Bearer ${ENV.RESEND_API_KEY}`, "Content-Type": "application/json" },
      timeout: 15000,
    },
  );
}

/* ─── sendEmail (base) ───────────────────────────────────────────────────── */

export async function sendEmail({ to, subject, html, text }) {
  const provider = ENV.MAIL_PROVIDER;
  if (!to) return { sent: false, reason: "sem destinatário" };
  if (!provider || provider === "none") return { sent: false, reason: "MAIL_PROVIDER=none" };

  // ── Modo teste: redireciona todos os e-mails para MAIL_REDIRECT_TO ──────────
  const redirectTo = ENV.MAIL_REDIRECT_TO;
  let actualTo = to;
  if (redirectTo) {
    console.log(`[MAIL] REDIRECT ativo: ${to} → ${redirectTo}`);
    actualTo = redirectTo;
    subject = `[TEST → ${to}] ${subject}`;
  }
  // ─────────────────────────────────────────────────────────────────────────────

  const htmlContent = html || (text ? `<pre>${text}</pre>` : "<p>—</p>");

  if (provider === "microsoft") {
    await sendViaMicrosoft({ to: actualTo, subject, html: htmlContent });
    return { sent: true, provider };
  }
  if (provider === "resend") {
    await sendViaResend({ to: actualTo, subject, html: htmlContent });
    return { sent: true, provider };
  }
  return { sent: false, reason: `provider desconhecido: ${provider}` };
}

/* ─── Notificações públicas ──────────────────────────────────────────────── */

/**
 * Lead oferecido ao consultor (SLA timer).
 * Dispara apenas para o consultor — gestão só é notificada em eventos inesperados.
 */
export async function notifyLeadOffer(lead, consultor) {
  const to = consultor?.email || lead?.emailConsultor;
  const nome = consultor?.nome || lead?.consultor;

  // Consultor
  if (to) {
    const { subject, html } = contentLeadOffer(lead, nome);
    try {
      const result = await sendEmail({ to, subject, html });
      if (result.sent) console.log(`[MAIL] Oferta → ${to}`);
      else console.log(`[MAIL] Oferta não enviada: ${result.reason}`);
    } catch (err) {
      console.error("[MAIL] Falha oferta consultor:", err.response?.data || err.message);
    }
  } else {
    console.warn("[MAIL] Oferta sem e-mail de consultor");
  }

  return { sent: Boolean(to) };
}

/**
 * Consultor aceitou o lead.
 * Dispara apenas para o consultor — gestão só é notificada em eventos inesperados.
 */
export async function notifyLeadAceito(lead, user) {
  const consultorNome = lead?.consultor || user?.name || null;
  const emailConsultor = lead?.emailConsultor || user?.email || null;

  // Consultor — confirmação
  if (emailConsultor) {
    const { subject, html } = contentLeadAceitoConsultor(lead, consultorNome);
    sendEmail({ to: emailConsultor, subject, html }).catch((err) =>
      console.error("[MAIL] Aceite consultor:", err.message),
    );
  }
}

/**
 * Consultor recusou o lead (explícito) OU não respondeu em 48h (timeout) →
 * só o gerente da região/gerência do lead. É exatamente o "evento inesperado"
 * que justifica avisar alguém além do próprio consultor.
 */
export async function notifyLeadRecusado(lead, { timeout = false } = {}) {
  const consultorNome = lead?.consultor || null;
  const gerenteEmails = await getGerenteEmails(lead);
  if (!gerenteEmails.length) return;
  const { subject, html } = contentLeadRecusado(lead, consultorNome, { timeout });
  sendEmailToMany(gerenteEmails, { subject, html }).catch(() => {});
}

/** Tentativa de contato registrada (1ª, 2ª ou 3ª) → só consultor. */
export async function notifyTentativa(lead, n, user) {
  const emailConsultor = lead?.emailConsultor || user?.email || null;
  if (!emailConsultor) return;
  const consultorNome = lead?.consultor || user?.name || null;
  const { subject, html } = contentTentativa(lead, consultorNome, n);
  sendEmail({ to: emailConsultor, subject, html }).catch((err) =>
    console.error("[MAIL] Tentativa:", err.message),
  );
}

/** Mudança de status (sem interesse, sem contato) → só consultor. */
export async function notifyStatusChange(lead, user, novoStatus) {
  const emailConsultor = lead?.emailConsultor || user?.email || null;
  if (!emailConsultor) return;
  const consultorNome = lead?.consultor || user?.name || null;
  const { subject, html } = contentStatusChange(lead, consultorNome, novoStatus);
  sendEmail({ to: emailConsultor, subject, html }).catch((err) =>
    console.error("[MAIL] Status change:", err.message),
  );
}

/**
 * Lead convertido → só consultor. Conversão é o resultado desejado, não um
 * evento inesperado — gerente não entra em cópia aqui.
 */
export async function notifyLeadConvertido(lead) {
  const emailConsultor = lead?.emailConsultor || null;
  const consultorNome = lead?.consultor || null;

  if (emailConsultor) {
    const { subject, html } = contentLeadConvertido(lead, consultorNome, false);
    sendEmail({ to: emailConsultor, subject, html }).catch((err) =>
      console.error("[MAIL] Convertido consultor:", err.message),
    );
  }
}

/**
 * Lead sem tratativa (3ª/4ª tentativa vencida sem ação) → consultor + gerente.
 * Evento inesperado — o gerente da região/gerência do lead entra em cópia.
 */
export async function notifyLeadSemTratativa(lead) {
  const emailConsultor = lead?.emailConsultor || null;
  const consultorNome = lead?.consultor || null;

  if (emailConsultor) {
    const { subject, html } = contentLeadSemTratativa(lead, consultorNome, false);
    sendEmail({ to: emailConsultor, subject, html }).catch((err) =>
      console.error("[MAIL] SemTratativa consultor:", err.message),
    );
  }

  const gerenteEmails = await getGerenteEmails(lead);
  if (gerenteEmails.length) {
    const { subject, html } = contentLeadSemTratativa(lead, consultorNome, true);
    sendEmailToMany(gerenteEmails, { subject, html }).catch(() => {});
  }
}

/* ─── Preview (não envia nada — só monta o HTML com dado de exemplo) ────── */

/**
 * Gera {subject, html} de todos os modelos de e-mail com um lead de
 * exemplo, sem chamar sendEmail em nenhum momento. Serve só pra visualizar/
 * ajustar template sem precisar criar lead de teste na base.
 */
export function previewEmailTemplates() {
  const sampleLead = {
    id: "preview-lead-id",
    nome: "Maria Aparecida Souza",
    regiao: "SUDESTE",
    cidade: "São Paulo",
    estado: "SP",
    especialidade: "Neurologia",
    consultor: "Lucas Piran",
    emailConsultor: "lucas.piran@tegrapharma.com",
    status: "Lead Em Qualificação",
    dataConversao: new Date().toISOString(),
  };
  const consultorNome = sampleLead.consultor;

  return [
    { key: "oferta_consultor", label: "1. Oferta SLA → consultor", ...contentLeadOffer(sampleLead, consultorNome) },
    { key: "oferta_gestao", label: "1b. Oferta SLA → aviso gestão (função existe, não é chamada hoje)", ...contentLeadOfferGestao(sampleLead, consultorNome) },
    { key: "aceito_consultor", label: "2. Lead aceito → consultor", ...contentLeadAceitoConsultor(sampleLead, consultorNome) },
    { key: "aceito_gestao", label: "2b. Lead aceito → aviso gestão (função existe, não é chamada hoje)", ...contentLeadAceitoGestao(sampleLead, consultorNome) },
    { key: "recusado_explicito", label: "3. Recusado — recusa explícita → gerente", ...contentLeadRecusado(sampleLead, consultorNome, { timeout: false }) },
    { key: "recusado_timeout", label: "3b. Recusado — timeout de 48h → gerente", ...contentLeadRecusado(sampleLead, consultorNome, { timeout: true }) },
    { key: "tentativa", label: "4. Tentativa de contato registrada → consultor", ...contentTentativa(sampleLead, consultorNome, 1) },
    { key: "status_change", label: "5. Mudança de status (Sem Interesse) → consultor", ...contentStatusChange(sampleLead, consultorNome, "Lead Sem Interesse") },
    { key: "convertido_consultor", label: "6. Lead convertido → consultor", ...contentLeadConvertido(sampleLead, consultorNome, false) },
    { key: "sem_tratativa_consultor", label: "7. Lead sem tratativa → consultor", ...contentLeadSemTratativa(sampleLead, consultorNome, false) },
    { key: "sem_tratativa_gerente", label: "7b. Lead sem tratativa → gerente", ...contentLeadSemTratativa(sampleLead, consultorNome, true) },
  ];
}
