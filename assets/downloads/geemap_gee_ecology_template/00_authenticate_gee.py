import ee
import geemap


def main():
    try:
        ee.Initialize()
        print("Earth Engine 已初始化。")
    except Exception:
        print("需要进行 Earth Engine 认证，浏览器会打开授权页面。")
        ee.Authenticate()
        ee.Initialize()
        print("认证并初始化完成。")

    print(f"geemap version: {geemap.__version__}")


if __name__ == "__main__":
    main()
